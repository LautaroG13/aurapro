"""create_sale es la operación que cierra el ciclo: Sale + SaleItems +
el evento VentaRealizada en outbox se escriben en la MISMA sesión y se
confirman con un único `db.commit()` al final -- si cualquier
validación (cliente, producto, stock) falla antes de eso, no se llama a
commit() y get_tenant_db hace rollback automático al salir del `async
with` con una excepción en vuelo. No hay una venta sin su evento, ni un
evento sin su venta.

La protección cruzada de tenant ("el customer_id y los product_id
pertenecen al mismo tenant") no es un chequeo manual nuevo: es gratis,
reusando exactamente el mismo mecanismo de app/db/tenant_session.py que
ya protege todo lo demás. Si `payload.customer_id` es de otro tenant, el
SELECT scoped por tenant simplemente no lo encuentra -- no hace falta
comparar tenant_id a mano en ningún lado de este archivo.
"""

import json
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.customers.models import Customer
from app.modules.products.models import Product
from app.modules.sales.models import Sale, SaleItem, SaleStatus
from app.modules.sales.schemas import SaleCreate
from app.schemas.sales_event import SalesEvent
from app.shared.outbox_model import OutboxEvent

SALES_EVENT_TYPE = "VentaRealizada"
SALES_EVENT_TOPIC = "aurapro.events.venta_realizada"  # ver workers/crates/outbox-processor


class CustomerNotFoundError(Exception):
    pass


class ProductNotFoundError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


class SaleNotFoundError(Exception):
    pass


async def create_sale(db: AsyncSession, tenant_id: UUID, payload: SaleCreate) -> Sale:
    customer = (
        await db.execute(select(Customer).where(Customer.id == payload.customer_id))
    ).scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {payload.customer_id} no encontrado")

    sale_items: list[SaleItem] = []
    product_details_for_event: list[dict] = []
    total_amount = 0.0

    for item in payload.items:
        product = (
            await db.execute(select(Product).where(Product.id == item.product_id))
        ).scalar_one_or_none()
        if product is None:
            raise ProductNotFoundError(f"Producto {item.product_id} no encontrado")

        # No pedido explícitamente, pero dejar vender por encima del
        # stock disponible es un bug real de negocio, no un detalle
        # opcional -- que el descuento efectivo sea asíncrono (lo hace
        # el worker) no significa que haya que permitir vender lo que
        # no hay.
        if product.current_stock < item.quantity:
            raise InsufficientStockError(
                f"Stock insuficiente para '{product.name}': "
                f"pedido {item.quantity}, disponible {product.current_stock}"
            )

        unit_price = float(product.price)
        sale_items.append(
            SaleItem(tenant_id=tenant_id, product_id=product.id, quantity=item.quantity, unit_price=unit_price)
        )
        product_details_for_event.append(
            {
                "product_id": str(product.id),
                "name": product.name,
                "quantity": item.quantity,
                "unit_price": unit_price,
            }
        )
        total_amount += unit_price * item.quantity

    sale = Sale(
        tenant_id=tenant_id,
        customer_id=customer.id,
        total_amount=total_amount,
        currency=payload.currency,
        status=SaleStatus.COMPLETED,
        payment_method=payload.payment_method,
    )
    sale.items = sale_items
    db.add(sale)
    await db.flush()  # asigna sale.id sin cerrar la transacción

    event = SalesEvent(
        event_id=uuid4(),
        timestamp=datetime.now(timezone.utc),
        tenant_id=str(tenant_id),
        product_details=product_details_for_event,
        transaction_amount={"amount": total_amount, "currency": payload.currency},
    )
    db.add(
        OutboxEvent(
            aggregate_id=str(tenant_id),
            event_type=SALES_EVENT_TYPE,
            payload=json.loads(event.model_dump_json()),
        )
    )

    await db.commit()
    await db.refresh(sale, attribute_names=["items"])
    return sale


async def list_sales(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Sale]:
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_sale(db: AsyncSession, sale_id: UUID) -> Sale:
    result = await db.execute(
        select(Sale).options(selectinload(Sale.items)).where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if sale is None:
        raise SaleNotFoundError(f"Venta {sale_id} no encontrada")
    return sale
