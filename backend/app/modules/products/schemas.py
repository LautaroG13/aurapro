from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    description: str | None = None
    price: float = Field(gt=0)
    current_stock: int = Field(ge=0, default=0)


class ProductUpdate(BaseModel):
    """Todos los campos opcionales -- PATCH parcial. tenant_id e id no
    son actualizables por diseño: no están acá."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    current_stock: int | None = Field(default=None, ge=0)


class ProductRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    price: float
    current_stock: int
    created_at: datetime
