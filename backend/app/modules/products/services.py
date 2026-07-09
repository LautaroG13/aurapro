"""El filtrado automático de get_tenant_db (with_loader_criteria) cubre
SELECT/UPDATE/DELETE -- una fila que todavía no existe no tiene nada que
filtrar. Por eso create_product recibe tenant_id explícito (siempre
current_user.tenant_id desde el JWT, nunca del body del request: ver
ProductCreate, que no tiene un campo tenant_id)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product, ProductVariant
from app.modules.products.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)


class ProductNotFoundError(Exception):
    pass


class ProductInUseError(Exception):
    pass


class ProductVariantNotFoundError(Exception):
    pass


async def create_product(db: AsyncSession, tenant_id: UUID, payload: ProductCreate) -> Product:
    product = Product(tenant_id=tenant_id, **payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def list_products(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Product]:
    result = await db.execute(
        select(Product).order_by(Product.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_product(db: AsyncSession, product_id: UUID) -> Product:
    """Si product_id existe pero es de otro tenant, get_tenant_db ya lo
    excluyó de la query -- esto tira NotFound, no un 403. Es la
    respuesta correcta: no confirmarle a un tenant que el ID de otro
    tenant existe."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise ProductNotFoundError(f"Producto {product_id} no encontrado")
    return product


async def update_product(db: AsyncSession, product_id: UUID, payload: ProductUpdate) -> Product:
    product = await get_product(db, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product_id: UUID) -> None:
    """product_id.ondelete="RESTRICT" en sale_items: si el producto
    tiene ventas asociadas, Postgres rechaza el DELETE con un
    IntegrityError. Se convierte acá en un error de dominio claro en vez
    de dejar que un 500 crudo llegue al cliente."""
    product = await get_product(db, product_id)
    await db.delete(product)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductInUseError(
            f"Producto {product_id} no se puede eliminar: tiene ventas asociadas"
        ) from exc


async def get_variant(db: AsyncSession, product_id: UUID, variant_id: UUID) -> ProductVariant:
    """Filtra por product_id además de variant_id: una variante de otro
    producto (aunque sea del mismo tenant) no debe resolverse acá --
    evita que una URL con product_id "equivocado" pero variant_id
    válido devuelva datos de un producto distinto."""
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id, ProductVariant.product_id == product_id
        )
    )
    variant = result.scalar_one_or_none()
    if variant is None:
        raise ProductVariantNotFoundError(f"Variante {variant_id} no encontrada")
    return variant


async def create_variant(
    db: AsyncSession, tenant_id: UUID, product_id: UUID, payload: ProductVariantCreate
) -> ProductVariant:
    await get_product(db, product_id)
    variant = ProductVariant(tenant_id=tenant_id, product_id=product_id, **payload.model_dump())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


async def update_variant(
    db: AsyncSession, product_id: UUID, variant_id: UUID, payload: ProductVariantUpdate
) -> ProductVariant:
    variant = await get_variant(db, product_id, variant_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    await db.commit()
    await db.refresh(variant)
    return variant


async def delete_variant(db: AsyncSession, product_id: UUID, variant_id: UUID) -> None:
    variant = await get_variant(db, product_id, variant_id)
    await db.delete(variant)
    await db.commit()
