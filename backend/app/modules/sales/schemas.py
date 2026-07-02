from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.sales.models import SaleStatus


class SaleItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    """Sin unit_price ni total_amount a propósito: el precio sale de
    Product.price en el momento de la venta, no del cliente -- si el
    request pudiera fijar el precio, cualquiera podría vender algo a
    $0.01."""

    model_config = ConfigDict(extra="forbid")

    customer_id: UUID
    payment_method: str = Field(min_length=1)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleItemRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    product_id: UUID
    quantity: int
    unit_price: float


class SaleRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    total_amount: float
    currency: str
    status: SaleStatus
    payment_method: str
    created_at: datetime
    items: list[SaleItemRead]
