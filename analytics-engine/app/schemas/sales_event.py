"""Modelo Pydantic que refleja shared/schemas/sales_event.json.

Copia deliberada de backend/app/schemas/sales_event.py: analytics-engine
es un deployable separado (su propio venv/imagen), así que no importa el
paquete `app` del backend. La fuente de verdad del contrato sigue siendo
el JSON Schema en shared/; si cambia, actualizar los tres bindings
(Pydantic acá y en backend, Serde+jsonschema en workers/).
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
    model_config = ConfigDict(extra="forbid")

    event_id: UUID
    event_type: Literal["VentaRealizada"] = "VentaRealizada"
    schema_version: Literal["1.0.0"] = "1.0.0"
    timestamp: datetime
    tenant_id: str = Field(min_length=1)
    product_details: list[ProductDetail] = Field(min_length=1)
    transaction_amount: TransactionAmount
