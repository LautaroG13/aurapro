"""Modelo Pydantic que refleja shared/schemas/sales_event.json.

Cualquier cambio de contrato debe reflejarse en ambos lugares (y en el
lado Rust, ver workers/crates/worker-core/src/schemas/sales_event.rs).
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PositiveInt


class ProductDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    quantity: PositiveInt
    unit_price: float = Field(gt=0)


class TransactionAmount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: float = Field(gt=0)
    currency: str = Field(pattern=r"^[A-Z]{3}$")


class SalesEvent(BaseModel):
    """Evento VentaRealizada. `event_type` y `schema_version` son fijos
    para que el modelo no acepte silenciosamente otro tipo de evento."""

    model_config = ConfigDict(extra="forbid")

    event_id: UUID
    event_type: Literal["VentaRealizada"] = "VentaRealizada"
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    tenant_id: str = Field(min_length=1)
    product_details: list[ProductDetail] = Field(min_length=1)
    transaction_amount: TransactionAmount
