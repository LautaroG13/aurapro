"""create_order_note es informativo, igual que create_quote: no toca
stock ni tesorería. El efecto real (descuento de stock, movimientos de
caja/cuenta corriente) ocurre recién cuando se "levanta" en una venta
real -- ver sales/services.py::create_sale y su manejo de
SaleCreate.order_note_id."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.customers.models import Customer
from app.modules.identity.models import Tenant
from app.modules.order_notes.models import OrderNote, OrderNoteItem, OrderNoteStatus
from app.modules.order_notes.schemas import OrderNoteCreate
from app.modules.products.models import Product, ProductVariant
from app.shared.pricing import resolve_unit_price


class CustomerNotFoundError(Exception):
    pass


class ProductNotFoundError(Exception):
    pass


class ProductVariantNotFoundError(Exception):
    pass


class VariantProductMismatchError(Exception):
    pass


class OrderNoteNotFoundError(Exception):
    pass


class OrderNoteNotPendingError(Exception):
    pass


class CannotSetInvoicedManuallyError(Exception):
    pass


async def create_order_note(db: AsyncSession, tenant_id: UUID, payload: OrderNoteCreate) -> OrderNote:
    customer = (
        await db.execute(
            select(Customer)
            .options(selectinload(Customer.customer_type))
            .where(Customer.id == payload.customer_id)
        )
    ).scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {payload.customer_id} no encontrado")

    order_note_items: list[OrderNoteItem] = []
    total_amount = 0.0

    for item in payload.items:
        product = (
            await db.execute(select(Product).where(Product.id == item.product_id))
        ).scalar_one_or_none()
        if product is None:
            raise ProductNotFoundError(f"Producto {item.product_id} no encontrado")

        if item.variant_id is not None:
            variant = (
                await db.execute(select(ProductVariant).where(ProductVariant.id == item.variant_id))
            ).scalar_one_or_none()
            if variant is None:
                raise ProductVariantNotFoundError(f"Variante {item.variant_id} no encontrada")
            if variant.product_id != product.id:
                raise VariantProductMismatchError(
                    f"La variante {variant.id} no pertenece al producto '{product.name}'"
                )

        unit_price = resolve_unit_price(customer, product)
        order_note_items.append(
            OrderNoteItem(
                tenant_id=tenant_id,
                product_id=product.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_price,
            )
        )
        total_amount += unit_price * item.quantity

    tenant = (
        await db.execute(select(Tenant).where(Tenant.id == tenant_id).with_for_update())
    ).scalar_one()
    order_note_number = tenant.next_order_note_number
    tenant.next_order_note_number += 1

    order_note = OrderNote(
        tenant_id=tenant_id,
        customer_id=customer.id,
        order_note_number=order_note_number,
        total_amount=total_amount,
        currency=payload.currency,
    )
    order_note.items = order_note_items
    db.add(order_note)
    await db.commit()
    await db.refresh(order_note, attribute_names=["items"])
    return order_note


async def list_order_notes(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[OrderNote]:
    result = await db.execute(
        select(OrderNote)
        .options(selectinload(OrderNote.items))
        .order_by(OrderNote.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_order_note(db: AsyncSession, order_note_id: UUID) -> OrderNote:
    result = await db.execute(
        select(OrderNote)
        .options(
            selectinload(OrderNote.items).selectinload(OrderNoteItem.product),
            selectinload(OrderNote.items).selectinload(OrderNoteItem.variant),
            selectinload(OrderNote.customer),
        )
        .where(OrderNote.id == order_note_id)
    )
    order_note = result.scalar_one_or_none()
    if order_note is None:
        raise OrderNoteNotFoundError(f"Nota de pedido {order_note_id} no encontrada")
    return order_note


async def update_order_note_status(
    db: AsyncSession, order_note_id: UUID, status: OrderNoteStatus
) -> OrderNote:
    # INVOICED solo lo pone create_sale al levantar la nota (ver
    # sales/services.py) -- este endpoint es para que un
    # ADMIN/VENDEDOR cancele una nota pendiente, no para facturarla
    # "a mano" sin pasar por una venta real.
    if status == OrderNoteStatus.INVOICED:
        raise CannotSetInvoicedManuallyError(
            "No se puede marcar una nota de pedido como facturada manualmente -- se factura desde Ventas"
        )
    order_note = await get_order_note(db, order_note_id)
    if order_note.status != OrderNoteStatus.PENDING:
        raise OrderNoteNotPendingError(
            f"La nota de pedido {order_note_id} no está pendiente (está {order_note.status.value})"
        )
    order_note.status = status
    await db.commit()
    await db.refresh(order_note, attribute_names=["items"])
    return order_note
