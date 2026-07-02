import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, UniqueConstraint, func
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
