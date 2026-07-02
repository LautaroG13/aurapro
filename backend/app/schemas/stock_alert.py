"""Respuesta de GET /api/v1/analytics/stock-alert/{product_id}.

El frontend tiene un `interface` de TypeScript que espeja este modelo
campo por campo (frontend/src/lib/api/types.ts) — si cambiás algo acá,
cambialo ahí también.
"""

from pydantic import BaseModel, ConfigDict


class StockAlertResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str
    days_until_out_of_stock: int | None
    confidence: float
