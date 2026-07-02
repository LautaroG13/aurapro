"""Combina el pronóstico de quiebre de stock (calculado por
analytics-engine, ver `inventory:forecast:{tenant}:{product}`) con el
stock *actual* en tiempo real, para servir
GET /api/v1/analytics/stock-alert/{product_id}.
"""

import json

from redis.asyncio import Redis

from app.schemas.stock_alert import StockAlertResponse

MIN_CONFIDENT_HISTORY_DAYS = 30


class ForecastNotFoundError(Exception):
    pass


class StockNotFoundError(Exception):
    pass


def _forecast_key(tenant_id: str, product_id: str) -> str:
    return f"inventory:forecast:{tenant_id}:{product_id}"


def _stock_key(tenant_id: str, product_id: str) -> str:
    return f"inventory:stock:{tenant_id}:{product_id}"


def _days_until_stockout(daily_forecast: list[float], current_stock: float) -> int | None:
    """Recorre el pronóstico diario ya calculado por analytics-engine (no
    reentrena el modelo acá, eso es trabajo del batch job) y lo cruza
    contra el stock *actual*, que puede haber cambiado desde que se
    corrió el forecast (TTL de 24h)."""
    if current_stock <= 0:
        return 0

    cumulative = 0.0
    for day_offset, qty in enumerate(daily_forecast, start=1):
        cumulative += qty
        if cumulative >= current_stock:
            return day_offset
    return None


async def get_stock_alert(redis: Redis, tenant_id: str, product_id: str) -> StockAlertResponse:
    raw_forecast = await redis.get(_forecast_key(tenant_id, product_id))
    if raw_forecast is None:
        raise ForecastNotFoundError(
            f"No hay pronóstico calculado todavía para tenant={tenant_id} product={product_id}"
        )

    raw_stock = await redis.get(_stock_key(tenant_id, product_id))
    if raw_stock is None:
        raise StockNotFoundError(
            f"No hay stock actual registrado para tenant={tenant_id} product={product_id}"
        )

    forecast = json.loads(raw_forecast)
    daily_forecast: list[float] = forecast.get("daily_forecast") or []
    history_days: int = forecast.get("history_days", 0)
    current_stock = float(raw_stock)

    days_until_out_of_stock = _days_until_stockout(daily_forecast, current_stock)

    # Heurística simple, no un intervalo de confianza estadístico real:
    # más días de historial detrás del forecast -> más confianza. Un
    # intervalo de confianza de verdad requeriría un forecast
    # probabilístico (Darts soporta num_samples > 1 para eso); queda
    # documentado como mejora futura en vez de improvisar un número que
    # parezca más riguroso de lo que es.
    confidence = round(min(history_days / MIN_CONFIDENT_HISTORY_DAYS, 1.0), 2)

    return StockAlertResponse(
        product_id=product_id,
        days_until_out_of_stock=days_until_out_of_stock,
        confidence=confidence,
    )
