from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.order_notes.models import OrderNoteStatus


class OrderNoteItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    variant_id: UUID | None = None
    quantity: int = Field(gt=0)


class OrderNoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_id: UUID
    currency: str = Field(default="ARS", pattern=r"^[A-Z]{3}$")
    items: list[OrderNoteItemCreate] = Field(min_length=1)


class OrderNoteStatusUpdate(BaseModel):
    """No acepta INVOICED -- ese estado solo lo puede poner
    create_sale al levantar la nota (ver services.py), nunca este
    endpoint directamente."""

    model_config = ConfigDict(extra="forbid")

    status: OrderNoteStatus


class OrderNoteItemRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    product_id: UUID
    variant_id: UUID | None
    quantity: int
    unit_price: float


class OrderNoteRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    order_note_number: int
    total_amount: float
    currency: str
    status: OrderNoteStatus
    sale_id: UUID | None
    created_at: datetime
    items: list[OrderNoteItemRead]
