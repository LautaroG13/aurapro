from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductVariantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attributes: dict[str, str] = Field(default_factory=dict)
    stock: int = Field(ge=0, default=0)


class ProductVariantUpdate(BaseModel):
    """Todos los campos opcionales -- PATCH parcial."""

    model_config = ConfigDict(extra="forbid")

    attributes: dict[str, str] | None = None
    stock: int | None = Field(default=None, ge=0)


class ProductVariantRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    product_id: UUID
    attributes: dict[str, str]
    stock: int
    created_at: datetime


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    description: str | None = None
    price: float = Field(gt=0)
    cost: float | None = Field(default=None, gt=0)
    current_stock: int = Field(ge=0, default=0)
    category: str | None = None
    sku: str | None = None
    barcode: str | None = None
    image_url: str | None = None


class ProductUpdate(BaseModel):
    """Todos los campos opcionales -- PATCH parcial. tenant_id e id no
    son actualizables por diseño: no están acá."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    cost: float | None = Field(default=None, gt=0)
    current_stock: int | None = Field(default=None, ge=0)
    category: str | None = None
    sku: str | None = None
    barcode: str | None = None
    image_url: str | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    price: float
    cost: float | None
    current_stock: int
    category: str | None
    sku: str | None
    barcode: str | None
    image_url: str | None
    created_at: datetime
    variants: list[ProductVariantRead] = []
