"""Generación automática de órdenes de compra al detectar riesgo de
quiebre de stock. La orden (PurchaseOrder + PurchaseOrderItem) y el
evento OrdenCompraGenerada en outbox se escriben con la misma Session,
sin commitear acá — el caller (backend/scripts/auto_purchaser.py)
controla la transacción, mismo criterio que sales_events.py."""

import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outbox import OutboxEvent
from app.models.purchase_orders import PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus
from app.schemas.purchase_order_event import (
    OrdenCompraGeneradaEvent,
    PurchaseOrderEventItem,
    PurchaseOrderReason,
)

OPEN_STATUSES = (PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT)


def has_recent_open_purchase_order(
    db: Session,
    tenant_id: str,
    product_id: str,
    within: timedelta = timedelta(hours=24),
) -> bool:
    """True si ya existe una PurchaseOrder DRAFT o SENT para este
    tenant/product creada dentro de la ventana `within`.

    Nota de concurrencia: esto es un check-then-act (SELECT, y recién
    después el caller decide si hace INSERT). Es correcto para el caso
    pedido — el mismo script corriendo varias veces por día, de forma
    secuencial (ej. cron por hora) — porque cada corrida hace el check
    dentro de su propia transacción antes de escribir. Si este script
    pudiera correr concurrentemente (dos procesos al mismo tiempo), esto
    no alcanza: haría falta una restricción a nivel DB (índice único
    parcial por tenant/product/día, o un advisory lock). No lo agregué
    porque no es el escenario descripto.
    """
    cutoff = datetime.now(timezone.utc) - within

    stmt = (
        select(PurchaseOrder.id)
        .join(PurchaseOrderItem, PurchaseOrderItem.purchase_order_id == PurchaseOrder.id)
        .where(
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrderItem.product_id == product_id,
            PurchaseOrder.status.in_([s.value for s in OPEN_STATUSES]),
            PurchaseOrder.created_at >= cutoff,
        )
        .limit(1)
    )
    return db.execute(stmt).first() is not None


def create_purchase_order_with_outbox_event(
    db: Session,
    tenant_id: str,
    product_id: str,
    quantity: int,
    unit_cost: float,
    days_until_out_of_stock: int,
    threshold_days: int,
) -> PurchaseOrder:
    """Agrega la PurchaseOrder (DRAFT, 1 item) y su evento de outbox a
    `db`, sin commitear. No hace el chequeo de idempotencia — eso lo
    decide el caller antes de llamar acá (ver has_recent_open_purchase_order)."""
    purchase_order = PurchaseOrder(tenant_id=tenant_id)
    purchase_order.items.append(
        PurchaseOrderItem(product_id=product_id, quantity=quantity, unit_cost=unit_cost)
    )
    db.add(purchase_order)
    db.flush()  # asigna purchase_order.id sin cerrar la transacción

    event = OrdenCompraGeneradaEvent(
        event_id=uuid4(),
        timestamp=datetime.now(timezone.utc),
        tenant_id=tenant_id,
        purchase_order_id=purchase_order.id,
        items=[PurchaseOrderEventItem(product_id=product_id, quantity=quantity, unit_cost=unit_cost)],
        reason=PurchaseOrderReason(
            days_until_out_of_stock=days_until_out_of_stock,
            threshold_days=threshold_days,
        ),
    )

    db.add(
        OutboxEvent(
            aggregate_id=tenant_id,
            event_type="OrdenCompraGenerada",
            payload=json.loads(event.model_dump_json()),
        )
    )

    return purchase_order
