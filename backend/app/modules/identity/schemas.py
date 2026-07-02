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
