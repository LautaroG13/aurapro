from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TenantCreateAdmin(BaseModel):
    """Igual forma que identity.TenantRegister -- de hecho reusa
    register_tenant() por dentro. Un tenant sin ningún usuario sería
    inútil (nadie podría loguearse), así que crear un tenant acá
    también crea su primer ADMIN, igual que el self-registro público."""

    model_config = ConfigDict(extra="forbid")

    tenant_name: str = Field(min_length=1)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)


class TenantSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    created_at: datetime
    user_count: int
    is_active: bool


class GlobalStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_tenants: int
    total_users: int
    total_products: int
    total_customers: int
    total_sales: int
    total_revenue: float
