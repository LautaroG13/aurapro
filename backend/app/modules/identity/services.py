import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password, verify_password
from app.modules.identity.models import Invitation, PasswordReset, Tenant, User, UserRole
from app.modules.identity.schemas import TenantProfileUpdate, UserUpdate

INVITATION_EXPIRY = timedelta(days=7)
PASSWORD_RESET_EXPIRY = timedelta(hours=1)


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


class UserNotFoundError(Exception):
    pass


class CannotDeleteSelfError(Exception):
    pass


class CannotDeleteLastAdminError(Exception):
    pass


class CannotDemoteLastAdminError(Exception):
    pass


class PasswordResetNotFoundError(Exception):
    pass


class PasswordResetExpiredError(Exception):
    pass


class PasswordResetAlreadyUsedError(Exception):
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


async def _get_user(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UserNotFoundError(f"Usuario {user_id} no encontrado")
    return user


async def _count_admins(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
    return result.scalar_one()


async def update_user(db: AsyncSession, user_id: UUID, payload: UserUpdate) -> User:
    user = await _get_user(db, user_id)
    updates = payload.model_dump(exclude_unset=True, exclude={"new_password"})
    if "role" in updates and updates["role"] != UserRole.ADMIN and user.role == UserRole.ADMIN:
        if await _count_admins(db) <= 1:
            raise CannotDemoteLastAdminError(
                "No se puede quitar el rol ADMIN al único administrador del tenant"
            )
    for field, value in updates.items():
        setattr(user, field, value)
    if payload.new_password is not None:
        user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: UUID, current_user_id: UUID) -> None:
    if user_id == current_user_id:
        raise CannotDeleteSelfError("No podés eliminar tu propia cuenta desde acá")
    user = await _get_user(db, user_id)
    if user.role == UserRole.ADMIN and await _count_admins(db) <= 1:
        raise CannotDeleteLastAdminError("No se puede eliminar al único administrador del tenant")
    await db.delete(user)
    await db.commit()


async def request_password_reset(db: AsyncSession, email: str) -> tuple[User, str] | None:
    """None si el email no existe -- el caller (routes.py) responde
    200 igual en ese caso, para no confirmarle a un desconocido si un
    email está registrado o no."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        return None

    reset = PasswordReset(
        tenant_id=user.tenant_id,
        user_id=user.id,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + PASSWORD_RESET_EXPIRY,
    )
    db.add(reset)
    await db.commit()
    await db.refresh(reset)
    return user, reset.token


async def reset_password(db: AsyncSession, token: str, new_password: str) -> User:
    result = await db.execute(select(PasswordReset).where(PasswordReset.token == token))
    reset = result.scalar_one_or_none()
    if reset is None:
        raise PasswordResetNotFoundError("Link de recuperación no encontrado")
    if reset.used_at is not None:
        raise PasswordResetAlreadyUsedError("Este link de recuperación ya fue utilizado")
    if reset.expires_at < datetime.now(timezone.utc):
        raise PasswordResetExpiredError("Este link de recuperación expiró")

    user = await _get_user(db, reset.user_id)
    user.hashed_password = hash_password(new_password)
    reset.used_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


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


# Solo formatos comunes de logo -- svg queda afuera a propósito
# porque fpdf2 no lo soporta nativamente para embeber en el PDF.
MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
ALLOWED_LOGO_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


class LogoTooLargeError(Exception):
    pass


class UnsupportedLogoTypeError(Exception):
    pass


async def get_tenant(db: AsyncSession, tenant_id: UUID) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    return result.scalar_one()


async def update_tenant_profile(db: AsyncSession, tenant_id: UUID, payload: TenantProfileUpdate) -> Tenant:
    tenant = await get_tenant(db, tenant_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(tenant, field, value)
    await db.commit()
    await db.refresh(tenant)
    return tenant


async def set_tenant_logo(db: AsyncSession, tenant_id: UUID, content: bytes, content_type: str) -> Tenant:
    if content_type not in ALLOWED_LOGO_CONTENT_TYPES:
        raise UnsupportedLogoTypeError(f"Tipo de archivo no soportado: {content_type}")
    if len(content) > MAX_LOGO_SIZE_BYTES:
        raise LogoTooLargeError("El logo no puede pesar más de 2MB")
    tenant = await get_tenant(db, tenant_id)
    tenant.logo = content
    tenant.logo_content_type = content_type
    await db.commit()
    await db.refresh(tenant)
    return tenant


def issue_token_for_user(user: User) -> str:
    return create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role.value,
        is_superadmin=user.is_superadmin,
    )
