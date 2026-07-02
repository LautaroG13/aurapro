"""Predicción de días para quiebre de stock a partir del historial diario
de ventas guardado en Redis por app/metrics/rolling_window.py, usando Darts
(ExponentialSmoothing).

Uso:
    cd analytics-engine
    python -m scripts.forecast_stockout --tenant-id t-42 --product-id sku-1 \
        --current-stock 500

Si no se pasa --current-stock, se busca en inventory:stock:{tenant}:{product}.
Ese key es una convención asumida: el proyecto todavía no tiene un
servicio de inventario propio, así que sembrala manualmente para probar:

    redis-cli SET inventory:stock:t-42:sku-1 500
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import pandas as pd
import redis
from darts import TimeSeries
from darts.models import ExponentialSmoothing

from app.metrics.redis_keys import daily_hash_key, forecast_key, stock_key

logger = logging.getLogger(__name__)

MIN_HISTORY_DAYS = 7
DEFAULT_HORIZON_DAYS = 30
FORECAST_TTL_SECONDS = 24 * 3600


@dataclass
class StockoutForecast:
    days_to_stockout: int | None
    stockout_date: date | None
    horizon_days: int
    daily_forecast: list[float]
    history_days: int
    note: str = ""

    def to_dict(self) -> dict:
        return {
            "days_to_stockout": self.days_to_stockout,
            "stockout_date": self.stockout_date.isoformat() if self.stockout_date else None,
            "horizon_days": self.horizon_days,
            "daily_forecast": self.daily_forecast,
            "history_days": self.history_days,
            "note": self.note,
        }


def _build_daily_series(daily_sales: dict[str, float]) -> pd.Series:
    """Convierte {'YYYY-MM-DD': cantidad} en una Series diaria continua,
    rellenando con 0 los días sin ventas. Darts necesita frecuencia
    regular (freq='D'); un hueco en las fechas rompe el fit."""
    if not daily_sales:
        return pd.Series(dtype=float)

    parsed = {datetime.strptime(k, "%Y-%m-%d").date(): v for k, v in daily_sales.items()}
    start, end = min(parsed), max(parsed)
    full_range = pd.date_range(start, end, freq="D")
    return pd.Series([parsed.get(d.date(), 0.0) for d in full_range], index=full_range)


def forecast_days_to_stockout(
    daily_sales: dict[str, float],
    current_stock: float,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    min_history_days: int = MIN_HISTORY_DAYS,
    today: date | None = None,
) -> StockoutForecast:
    """Función pura (sin I/O) para que sea fácil de testear: recibe el
    historial diario ya leído de Redis y el stock actual, devuelve la
    predicción."""
    today = today or date.today()
    series = _build_daily_series(daily_sales)

    if len(series) < min_history_days:
        return StockoutForecast(
            days_to_stockout=None,
            stockout_date=None,
            horizon_days=horizon_days,
            daily_forecast=[],
            history_days=len(series),
            note=f"Historial insuficiente ({len(series)} días, se necesitan >= {min_history_days})",
        )

    if current_stock <= 0:
        return StockoutForecast(
            days_to_stockout=0,
            stockout_date=today,
            horizon_days=horizon_days,
            daily_forecast=[],
            history_days=len(series),
            note="Stock actual ya es 0 o negativo",
        )

    ts = TimeSeries.from_series(series, freq="D")
    model = ExponentialSmoothing()
    model.fit(ts)
    forecast = model.predict(horizon_days)

    # Ventas no pueden ser negativas: un modelo estadístico sobre una
    # serie ruidosa o con tendencia bajista sí puede proyectar valores
    # negativos, así que se recorta a 0 antes de acumular.
    daily_forecast = [max(0.0, v) for v in forecast.values().flatten().tolist()]

    cumulative = 0.0
    for day_offset, qty in enumerate(daily_forecast, start=1):
        cumulative += qty
        if cumulative >= current_stock:
            return StockoutForecast(
                days_to_stockout=day_offset,
                stockout_date=today + timedelta(days=day_offset),
                horizon_days=horizon_days,
                daily_forecast=daily_forecast,
                history_days=len(series),
            )

    return StockoutForecast(
        days_to_stockout=None,
        stockout_date=None,
        horizon_days=horizon_days,
        daily_forecast=daily_forecast,
        history_days=len(series),
        note=f"No se proyecta quiebre de stock dentro de los próximos {horizon_days} días",
    )


def run(
    redis_client: "redis.Redis",
    tenant_id: str,
    product_id: str,
    current_stock: float | None,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    write_back: bool = True,
) -> StockoutForecast:
    raw_daily = redis_client.hgetall(daily_hash_key(tenant_id, product_id))
    daily_sales = {k: float(v) for k, v in raw_daily.items()}

    if current_stock is None:
        raw_stock = redis_client.get(stock_key(tenant_id, product_id))
        if raw_stock is None:
            raise ValueError(
                f"No se pasó --current-stock y no existe "
                f"{stock_key(tenant_id, product_id)} en Redis"
            )
        current_stock = float(raw_stock)

    result = forecast_days_to_stockout(daily_sales, current_stock, horizon_days=horizon_days)

    if write_back:
        redis_client.set(
            forecast_key(tenant_id, product_id),
            json.dumps(result.to_dict()),
            ex=FORECAST_TTL_SECONDS,
        )

    return result


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--current-stock", type=float, default=None)
    parser.add_argument("--horizon-days", type=int, default=DEFAULT_HORIZON_DAYS)
    parser.add_argument("--redis-url", default="redis://localhost:6379/0")
    parser.add_argument("--no-write-back", action="store_true")
    args = parser.parse_args()

    redis_client = redis.Redis.from_url(args.redis_url, decode_responses=True)
    result = run(
        redis_client,
        args.tenant_id,
        args.product_id,
        args.current_stock,
        horizon_days=args.horizon_days,
        write_back=not args.no_write_back,
    )

    if result.days_to_stockout is not None:
        print(
            f"Quiebre de stock estimado en {result.days_to_stockout} día(s) "
            f"({result.stockout_date}), con {result.history_days} días de historial."
        )
    else:
        print(f"Sin quiebre proyectado dentro del horizonte. {result.note}")


if __name__ == "__main__":
    main()
