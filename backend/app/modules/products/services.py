"""El filtrado automático de get_tenant_db (with_loader_criteria) cubre
SELECT/UPDATE/DELETE -- una fila que todavía no existe no tiene nada que
filtrar. Por eso create_product recibe tenant_id explícito (siempre
current_user.tenant_id desde el JWT, nunca del body del request: ver
ProductCreate, que no tiene un campo tenant_id)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product
from app.modules.products.schemas import ProductCreate, ProductUpdate


class ProductNotFoundError(Exception):
    pass


class ProductInUseError(Exception):
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
