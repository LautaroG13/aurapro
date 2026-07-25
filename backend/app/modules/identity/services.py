import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password, verify_password
from app.modules.identity.models import Invitation, Tenant, User, UserRole

INVITATION_EXPIRY = timedelta(days=7)


class InvalidCredentialsError(Exception):
    pass


class EmailAlreadyRegisteredError(Exception):
    pass


class TenantSuspendedError(Exception):
    pass


class InvitationNotFoundError(Exception):
    pass


class InvitationExpiredError(Exception):
    pass


class InvitationAlreadyAcceptedError(Exception):
    pass


async def register_tenant(
    db: AsyncSession, tenant_name: str, admin_email: str, admin_password: str
) -> tuple[Tenant, User]:
    existing = await db.execute(select(User).where(User.email == admin_email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyRegisteredError(f"{admin_email} ya está registrado")

    tenant = Tenant(name=tenant_name)
    db.add(tenant)
    await db.flush()  # asigna tenant.id sin cerrar la transacción

    admin = User(
        tenant_id=tenant.id,
        email=admin_email,
        hashed_password=hash_password(admin_password),
        role=UserRole.ADMIN,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return tenant, admin


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Busca por email sin scoping de tenant -- es intencional, ver el
    comentario en User.__table_args__: el tenant recién se sabe después
    de encontrar al usuario."""
    result = await db.execute(
        select(User).options(selectinload(User.tenant)).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Email o contraseña inválidos")

    # Chequeo de credenciales primero, de suspensión después: no le
    # confirmamos a alguien con password incorrecta si el tenant existe
    # o está suspendido.
    if not user.tenant.is_active:
        raise TenantSuspendedError("Esta organización está suspendida")

    return user


async def list_salespeople(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).where(User.role == UserRole.VENDEDOR))
    return list(result.scalars().all())


async def create_invitation(
    db: AsyncSession, tenant_id: UUID, invited_by_user_id: UUID, email: str, role: UserRole
) -> Invitation:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyRegisteredError(f"{email} ya está registrado")

    invitation = Invitation(
        tenant_id=tenant_id,
        email=email,
        role=role,
        token=secrets.token_urlsafe(32),
        invited_by_user_id=invited_by_user_id,
        expires_at=datetime.now(timezone.utc) + INVITATION_EXPIRY,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    return invitation


async def list_invitations(db: AsyncSession) -> list[Invitation]:
    result = await db.execute(select(Invitation).order_by(Invitation.created_at.desc()))
    return list(result.scalars().all())


def _check_invitation_usable(invitation: Invitation | None) -> Invitation:
    if invitation is None:
        raise InvitationNotFoundError("Invitación no encontrada")
    if invitation.accepted_at is not None:
        raise InvitationAlreadyAcceptedError("Esta invitación ya fue utilizada")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise InvitationExpiredError("Esta invitación expiró")
    return invitation


async def get_invitation_preview(db: AsyncSession, token: str) -> tuple[Invitation, Tenant]:
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = _check_invitation_usable(result.scalar_one_or_none())

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == invitation.tenant_id))
    return invitation, tenant_result.scalar_one()


async def accept_invitation(db: AsyncSession, token: str, password: str) -> User:
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = _check_invitation_usable(result.scalar_one_or_none())

    existing = await db.execute(select(User).where(User.email == invitation.email))
    if existing.scalar_one_or_none() is not None:
        raise EmailAlreadyRegisteredError(f"{invitation.email} ya está registrado")

    user = User(
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        hashed_password=hash_password(password),
        role=invitation.role,
    )
    db.add(user)
    invitation.accepted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


def issue_token_for_user(user: User) -> str:
    return create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role.value,
        is_superadmin=user.is_superadmin,
    )
