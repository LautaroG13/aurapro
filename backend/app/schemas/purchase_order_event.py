"""Modelo Pydantic que refleja shared/schemas/purchase_order_event.json.
Mismo patrón que sales_event.py."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PositiveInt


class PurchaseOrderEventItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str = Field(min_length=1)
    quantity: PositiveInt
    unit_cost: float = Field(gt=0)


class PurchaseOrderReason(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trigger: Literal["low_stock_forecast"] = "low_stock_forecast"
    days_until_out_of_stock: int = Field(ge=0)
    threshold_days: int = Field(ge=0)


class OrdenCompraGeneradaEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: UUID
    event_type: Literal["OrdenCompraGenerada"] = "OrdenCompraGenerada"
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    tenant_id: str = Field(min_length=1)
    purchase_order_id: UUID
    status: Literal["DRAFT"] = "DRAFT"
    items: list[PurchaseOrderEventItem] = Field(min_length=1)
    reason: PurchaseOrderReason
