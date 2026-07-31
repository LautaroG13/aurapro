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
from app.modules.identity.models import Tenant
from app.modules.order_notes.models import OrderNote, OrderNoteStatus
from app.modules.order_notes.services import (
    OrderNoteCustomerMismatchError,
    OrderNoteNotFoundError,
    OrderNoteNotPendingError,
)
from app.modules.products.models import Product, ProductVariant
from app.modules.sales.models import Sale, SaleItem, SaleStatus
from app.modules.sales.schemas import SaleCreate
from app.modules.treasury.services import (
    InsufficientCreditError,
    record_cash_income_from_sale,
    record_sale_on_account,
)
from app.schemas.sales_event import SalesEvent
from app.shared.outbox_model import OutboxEvent
from app.shared.pricing import resolve_unit_price

SALES_EVENT_TYPE = "VentaRealizada"
SALES_EVENT_TOPIC = "aurapro.events.venta_realizada"  # ver workers/crates/outbox-processor

ACCOUNT_PAYMENT_METHOD = "account"
CASH_PAYMENT_METHOD = "cash"


class CustomerNotFoundError(Exception):
    pass


class ProductNotFoundError(Exception):
    pass


class ProductVariantNotFoundError(Exception):
    pass


class VariantProductMismatchError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


class SaleNotFoundError(Exception):
    pass


async def _lock_for_update(db: AsyncSession, model, entity_id: UUID):
    return (
        await db.execute(select(model).where(model.id == entity_id).with_for_update())
    ).scalar_one_or_none()


def _discount_stock(entity, stock_attr: str, quantity: int, label: str) -> None:
    current = getattr(entity, stock_attr)
    if current < quantity:
        raise InsufficientStockError(
            f"Stock insuficiente para '{label}': pedido {quantity}, disponible {current}"
        )
    setattr(entity, stock_attr, current - quantity)


async def create_sale(db: AsyncSession, tenant_id: UUID, payload: SaleCreate) -> Sale:
    customer = (
        await db.execute(
            select(Customer)
            .options(selectinload(Customer.customer_type))
            .where(Customer.id == payload.customer_id)
        )
    ).scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {payload.customer_id} no encontrado")

    # Si esta venta levanta una nota de pedido, se valida y lockea acá
    # (fail-fast, antes de tocar stock) -- el update real (INVOICED +
    # sale_id) recién se aplica después de flush(), cuando sale.id existe.
    order_note: OrderNote | None = None
    if payload.order_note_id is not None:
        order_note = await _lock_for_update(db, OrderNote, payload.order_note_id)
        if order_note is None:
            raise OrderNoteNotFoundError(f"Nota de pedido {payload.order_note_id} no encontrada")
        if order_note.status != OrderNoteStatus.PENDING:
            raise OrderNoteNotPendingError(
                f"La nota de pedido {payload.order_note_id} no está pendiente (está {order_note.status.value})"
            )
        if order_note.customer_id != customer.id:
            raise OrderNoteCustomerMismatchError(
                f"La nota de pedido {payload.order_note_id} pertenece a otro cliente"
            )

    sale_items: list[SaleItem] = []
    product_details_for_event: list[dict] = []
    total_amount = 0.0

    for item in payload.items:
        # FOR UPDATE (en _lock_for_update): toma el lock de fila dentro
        # de esta misma transacción. Si dos ventas concurrentes piden el
        # mismo producto/variante, la segunda espera a que la primera
        # haga commit (o rollback) antes de leer el stock -- sin esto,
        # ambas podrían leer el mismo stock disponible y descontar sin
        # ver el descuento de la otra.
        product = await _lock_for_update(db, Product, item.product_id)
        if product is None:
            raise ProductNotFoundError(f"Producto {item.product_id} no encontrado")

        if item.variant_id is not None:
            variant = await _lock_for_update(db, ProductVariant, item.variant_id)
            if variant is None:
                raise ProductVariantNotFoundError(f"Variante {item.variant_id} no encontrada")
            if variant.product_id != product.id:
                raise VariantProductMismatchError(
                    f"La variante {variant.id} no pertenece al producto '{product.name}'"
                )
            _discount_stock(variant, "stock", item.quantity, f"{product.name} ({variant.sku or variant.attributes})")
        else:
            # Descuento síncrono, en la misma transacción de la venta --
            # ya no depende de que un worker async lo procese después
            # (ver worker-processor, que hoy solo loguea el evento y no
            # toca stock).
            _discount_stock(product, "current_stock", item.quantity, product.name)

        unit_price = resolve_unit_price(customer, product)
        sale_items.append(
            SaleItem(
                tenant_id=tenant_id,
                product_id=product.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_price,
            )
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

    # Lock sobre Tenant para asignar sale_number sin duplicados/gaps
    # bajo ventas concurrentes -- mismo patrón que _lock_for_update
    # sobre stock, pero acá sobre el contador del tenant.
    tenant = await _lock_for_update(db, Tenant, tenant_id)
    sale_number = tenant.next_sale_number
    tenant.next_sale_number += 1

    sale = Sale(
        tenant_id=tenant_id,
        customer_id=customer.id,
        sale_number=sale_number,
        total_amount=total_amount,
        currency=payload.currency,
        status=SaleStatus.COMPLETED,
        payment_method=payload.payment_method,
        card_coupon_number=payload.card_coupon_number,
        card_authorization_code=payload.card_authorization_code,
    )
    sale.items = sale_items
    db.add(sale)
    await db.flush()  # asigna sale.id sin cerrar la transacción

    if order_note is not None:
        order_note.status = OrderNoteStatus.INVOICED
        order_note.sale_id = sale.id

    # Enganche con tesorería, misma transacción que la venta: si el
    # crédito no alcanza, InsufficientCreditError se propaga sin
    # commit() y get_tenant_db hace rollback de todo (venta incluida).
    if payload.payment_method == ACCOUNT_PAYMENT_METHOD:
        await record_sale_on_account(db, tenant_id, customer, sale)
    elif payload.payment_method == CASH_PAYMENT_METHOD:
        await record_cash_income_from_sale(db, tenant_id, sale)

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
        select(Sale)
        .options(
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.items).selectinload(SaleItem.variant),
            selectinload(Sale.customer),
        )
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if sale is None:
        raise SaleNotFoundError(f"Venta {sale_id} no encontrada")
    return sale
