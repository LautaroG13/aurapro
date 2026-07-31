"""create_quote es informativo: a diferencia de create_sale, NO toca
stock (no hay _discount_stock ni lock sobre Product/ProductVariant) y
NO interactúa con tesorería ni dispara el evento de outbox -- un
presupuesto no es una transacción, es una propuesta de precio."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.customers.models import Customer
from app.modules.identity.models import Tenant
from app.modules.products.models import Product, ProductVariant
from app.modules.quotes.models import Quote, QuoteItem, QuoteStatus
from app.modules.quotes.schemas import QuoteCreate
from app.shared.pricing import resolve_unit_price


class CustomerNotFoundError(Exception):
    pass


class ProductNotFoundError(Exception):
    pass


class ProductVariantNotFoundError(Exception):
    pass


class VariantProductMismatchError(Exception):
    pass


class QuoteNotFoundError(Exception):
    pass


async def create_quote(db: AsyncSession, tenant_id: UUID, payload: QuoteCreate) -> Quote:
    customer = (
        await db.execute(
            select(Customer)
            .options(selectinload(Customer.customer_type))
            .where(Customer.id == payload.customer_id)
        )
    ).scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {payload.customer_id} no encontrado")

    quote_items: list[QuoteItem] = []
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
        quote_items.append(
            QuoteItem(
                tenant_id=tenant_id,
                product_id=product.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_price,
            )
        )
        total_amount += unit_price * item.quantity

    # Lock sobre Tenant para asignar quote_number sin duplicados bajo
    # presupuestos concurrentes -- mismo patrón que sale_number.
    tenant = (
        await db.execute(select(Tenant).where(Tenant.id == tenant_id).with_for_update())
    ).scalar_one()
    quote_number = tenant.next_quote_number
    tenant.next_quote_number += 1

    quote = Quote(
        tenant_id=tenant_id,
        customer_id=customer.id,
        quote_number=quote_number,
        total_amount=total_amount,
        currency=payload.currency,
        valid_until=payload.valid_until,
    )
    quote.items = quote_items
    db.add(quote)
    await db.commit()
    await db.refresh(quote, attribute_names=["items"])
    return quote


async def list_quotes(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Quote]:
    result = await db.execute(
        select(Quote)
        .options(selectinload(Quote.items))
        .order_by(Quote.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_quote(db: AsyncSession, quote_id: UUID) -> Quote:
    result = await db.execute(
        select(Quote)
        .options(
            selectinload(Quote.items).selectinload(QuoteItem.product),
            selectinload(Quote.items).selectinload(QuoteItem.variant),
            selectinload(Quote.customer),
        )
        .where(Quote.id == quote_id)
    )
    quote = result.scalar_one_or_none()
    if quote is None:
        raise QuoteNotFoundError(f"Presupuesto {quote_id} no encontrado")
    return quote


async def update_quote_status(db: AsyncSession, quote_id: UUID, status: QuoteStatus) -> Quote:
    quote = await get_quote(db, quote_id)
    quote.status = status
    await db.commit()
    await db.refresh(quote, attribute_names=["items"])
    return quote
