from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password, verify_password
from app.modules.identity.models import Tenant, User, UserRole


class InvalidCredentialsError(Exception):
    pass


class EmailAlreadyRegisteredError(Exception):
    pass


class TenantSuspendedError(Exception):
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


def issue_token_for_user(user: User) -> str:
    return create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role.value,
        is_superadmin=user.is_superadmin,
    )
