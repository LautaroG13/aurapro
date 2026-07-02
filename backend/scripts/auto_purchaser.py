"""Cierra el ciclo: si el pronóstico de stock (analytics-engine, vía
Redis) dice que faltan menos de --threshold-days para el quiebre, genera
una PurchaseOrder (DRAFT) con su evento OrdenCompraGenerada en outbox —
todo en la misma transacción de Postgres (ver
app/services/purchase_orders.py). Es idempotente: si ya hay una PO
DRAFT/SENT para ese tenant/product en las últimas 24h, no crea otra.

Uso:
    cd backend
    python -m scripts.auto_purchaser --tenant-id t-42 --product-id sku-1 \
        --reorder-quantity 200 --unit-cost 8.50

No hay catálogo de proveedores/precios en este proyecto todavía, así que
--reorder-quantity y --unit-cost son inputs manuales (igual que
--current-stock en forecast_stockout.py). Pensado para correr por cron
(ej. cada hora) una vez por producto; un orquestador que enumere el
catálogo de cada tenant todavía no existe.
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from redis.asyncio import Redis
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.purchase_orders import (
    create_purchase_order_with_outbox_event,
    has_recent_open_purchase_order,
)
from app.services.stock_alerts import ForecastNotFoundError, StockNotFoundError, get_stock_alert

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD_DAYS = 7


async def maybe_create_purchase_order(
    db: Session,
    redis: Redis,
    tenant_id: str,
    product_id: str,
    reorder_quantity: int,
    unit_cost: float,
    threshold_days: int = DEFAULT_THRESHOLD_DAYS,
):
    try:
        alert = await get_stock_alert(redis, tenant_id, product_id)
    except (ForecastNotFoundError, StockNotFoundError) as exc:
        logger.info("no se puede evaluar tenant=%s product=%s: %s", tenant_id, product_id, exc)
        return None

    if alert.days_until_out_of_stock is None or alert.days_until_out_of_stock >= threshold_days:
        logger.info(
            "tenant=%s product=%s no cruza el threshold (days_until_out_of_stock=%s, threshold=%d)",
            tenant_id,
            product_id,
            alert.days_until_out_of_stock,
            threshold_days,
        )
        return None

    if has_recent_open_purchase_order(db, tenant_id, product_id):
        logger.info(
            "tenant=%s product=%s ya tiene una PO DRAFT/SENT en las últimas 24h, no se duplica",
            tenant_id,
            product_id,
        )
        return None

    purchase_order = create_purchase_order_with_outbox_event(
        db,
        tenant_id=tenant_id,
        product_id=product_id,
        quantity=reorder_quantity,
        unit_cost=unit_cost,
        days_until_out_of_stock=alert.days_until_out_of_stock,
        threshold_days=threshold_days,
    )
    db.commit()

    logger.info(
        "PurchaseOrder %s creada (DRAFT) para tenant=%s product=%s: %d unidades @ %.2f "
        "(days_until_out_of_stock=%d < threshold=%d)",
        purchase_order.id,
        tenant_id,
        product_id,
        reorder_quantity,
        unit_cost,
        alert.days_until_out_of_stock,
        threshold_days,
    )
    return purchase_order


async def _run(args: argparse.Namespace) -> None:
    db = SessionLocal()
    redis = Redis.from_url(args.redis_url, decode_responses=True)
    try:
        result = await maybe_create_purchase_order(
            db,
            redis,
            tenant_id=args.tenant_id,
            product_id=args.product_id,
            reorder_quantity=args.reorder_quantity,
            unit_cost=args.unit_cost,
            threshold_days=args.threshold_days,
        )
        if result is None:
            print("No se generó ninguna orden de compra (ver logs).")
        else:
            print(f"PurchaseOrder {result.id} creada en estado DRAFT.")
    finally:
        db.close()
        await redis.aclose()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--reorder-quantity", type=int, required=True)
    parser.add_argument("--unit-cost", type=float, required=True)
    parser.add_argument("--threshold-days", type=int, default=DEFAULT_THRESHOLD_DAYS)
    parser.add_argument("--redis-url", default="redis://localhost:6379/0")
    args = parser.parse_args()

    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
