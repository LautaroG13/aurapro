import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.shared.tenant_model import TenantModel


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    VENDEDOR = "VENDEDOR"
    VIEWER = "VIEWER"


class Tenant(Base):
    """Una organización/cliente del SaaS. No hereda TenantModel: un
    Tenant no pertenece a un tenant, ES el tenant. Todo lo demás
    (User acá, y a futuro Products/Sales/Finance/Customers) hereda
    TenantModel y apunta a tenants.id vía su tenant_id."""

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    # Suspender un tenant (app/modules/admin) baja esto a False. Se
    # aplica en el login (authenticate_user) -- un usuario de un tenant
    # suspendido no puede generar un token nuevo. No revoca tokens ya
    # emitidos (el diseño de JWT de este proyecto es stateless, sin
    # blacklist); son válidos hasta que expiran.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")


class User(Base, TenantModel):
    __tablename__ = "users"
    __table_args__ = (
        # Único a nivel global, no por tenant: el login busca por email
        # sin conocer todavía a qué tenant pertenece (ver
        # services.authenticate_user). Si fuera único solo por tenant,
        # dos organizaciones distintas con un usuario del mismo email
        # harían el login ambiguo.
        UniqueConstraint("email", name="uq_users_email"),
    )

    email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=20),
        nullable=False,
    )
    # Acceso de plataforma, ortogonal a `role` (que es el rol *dentro*
    # de un tenant). Sin endpoint público que lo setee -- ningún schema
    # de request (TenantRegister, futuros "crear usuario", etc.) tiene
    # este campo. La única forma de otorgarlo es un UPDATE directo en
    # la base por un operador con acceso a Postgres. Ver
    # app/db/tenant_session.py para qué habilita exactamente.
    is_superadmin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    tenant: Mapped["Tenant"] = relationship(back_populates="users")


class Invitation(Base, TenantModel):
    """Invitación pendiente para sumar un usuario a un tenant existente.
    El primer usuario de un tenant se crea directo en register_tenant
    (TenantRegister); a partir de ahí, todo usuario nuevo pasa por acá.
    `token` es de un solo uso -- `accepted_at` no nulo lo invalida."""

    __tablename__ = "invitations"

    email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=20),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    # SET NULL en vez de RESTRICT/CASCADE: quién invitó es informativo,
    # no debería bloquear borrar ese User más adelante.
    invited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordReset(Base, TenantModel):
    """Token de un solo uso para recuperar contraseña, mismo patrón que
    Invitation (token + expires_at + *_at que marca uso). Expira mucho
    antes que una invitación (1 hora, no 7 días) -- es un flujo de
    self-service inmediato, no algo que alguien deje pendiente días."""

    __tablename__ = "password_resets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
