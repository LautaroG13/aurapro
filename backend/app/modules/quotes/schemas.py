from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.quotes.models import QuoteStatus


class QuoteItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    variant_id: UUID | None = None
    quantity: int = Field(gt=0)


class QuoteCreate(BaseModel):
    """Sin unit_price ni total_amount, mismo criterio que SaleCreate: el
    precio sale de Product.price/wholesale_price en el momento de
    crear el presupuesto, no del cliente."""

    model_config = ConfigDict(extra="forbid")

    customer_id: UUID
    currency: str = Field(default="ARS", pattern=r"^[A-Z]{3}$")
    valid_until: date | None = None
    items: list[QuoteItemCreate] = Field(min_length=1)


class QuoteStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: QuoteStatus


class QuoteItemRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    product_id: UUID
    variant_id: UUID | None
    quantity: int
    unit_price: float


class QuoteRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    quote_number: int
    total_amount: float
    currency: str
    status: QuoteStatus
    valid_until: date | None
    created_at: datetime
    items: list[QuoteItemRead]
