from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.identity.models import UserRole


class TenantRegister(BaseModel):
    """Alta de una organización nueva: crea el Tenant y su primer User,
    que siempre es ADMIN. Invitar más usuarios a un tenant existente es
    un endpoint que todavía no existe (fuera de alcance de este
    esqueleto)."""

    model_config = ConfigDict(extra="forbid")

    tenant_name: str = Field(min_length=1)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    role: UserRole
    is_superadmin: bool
    created_at: datetime


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: UserRole


class InvitationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    email: str
    role: UserRole
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None


class InvitationPreview(BaseModel):
    """Lo que ve el invitado antes de aceptar -- sin id ni token, solo lo
    necesario para mostrar a qué tenant y con qué rol se está sumando."""

    model_config = ConfigDict(extra="forbid")

    tenant_name: str
    email: str
    role: UserRole


class InvitationAccept(BaseModel):
    model_config = ConfigDict(extra="forbid")

    password: str = Field(min_length=8)


class SalespersonRead(BaseModel):
    """Vista mínima de User para poblar selects (ej. vendedor default de
    un cliente) sin exponer role/is_superadmin/tenant_id a un VENDEDOR
    que no debería ver esos campos de sus compañeros."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    email: str
