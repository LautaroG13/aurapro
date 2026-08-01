"""El filtrado automático de get_tenant_db (with_loader_criteria) cubre
SELECT/UPDATE/DELETE -- una fila que todavía no existe no tiene nada que
filtrar. Por eso create_product recibe tenant_id explícito (siempre
current_user.tenant_id desde el JWT, nunca del body del request: ver
ProductCreate, que no tiene un campo tenant_id)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.products.models import (
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductCategory,
    ProductVariant,
)
from app.modules.products.schemas import (
    ProductAttributeCreate,
    ProductAttributeValueCreate,
    ProductCategoryCreate,
    ProductCreate,
    ProductUpdate,
    ProductVariantBulkCreate,
    ProductVariantCreate,
    ProductVariantUpdate,
)


class ProductNotFoundError(Exception):
    pass


class ProductInUseError(Exception):
    pass


class ProductSkuConflictError(Exception):
    """El SKU ya existe para otro producto de este tenant -- se levanta
    al capturar el IntegrityError del UniqueConstraint."""

    pass


class ProductVariantAttributesConflictError(Exception):
    """Dos variantes del mismo producto con la misma combinación de
    atributos (ej. color=rojo, talle=M) -- no hay UniqueConstraint en
    la base para esto (attributes es JSONB libre), así que se valida a
    mano antes de insertar."""

    pass


class ProductCategoryNotFoundError(Exception):
    pass


class ProductCategoryDuplicateNameError(Exception):
    pass


class InvalidCategoryError(Exception):
    pass


class ProductAttributeNotFoundError(Exception):
    pass


class ProductAttributeDuplicateNameError(Exception):
    pass


class ProductAttributeValueNotFoundError(Exception):
    pass


class ProductAttributeValueDuplicateError(Exception):
    pass


class ProductVariantNotFoundError(Exception):
    pass


class ProductVariantDuplicateError(Exception):
    """SKUs repetidos dentro del mismo payload bulk -- se detecta antes
    de tocar la base para dar un mensaje específico en vez de un
    IntegrityError genérico de Postgres."""

    pass


class ProductVariantSkuConflictError(Exception):
    """Un SKU del payload ya existe en la base (de esta u otra
    variante). Se levanta al capturar el IntegrityError del
    UniqueConstraint -- ninguna variante del lote queda creada."""

    pass


async def _validate_category(db: AsyncSession, category_id: UUID | None) -> None:
    if category_id is None:
        return
    result = await db.execute(select(ProductCategory.id).where(ProductCategory.id == category_id))
    if result.scalar_one_or_none() is None:
        raise InvalidCategoryError(f"Categoría {category_id} no existe en este tenant")


async def create_product(db: AsyncSession, tenant_id: UUID, payload: ProductCreate) -> Product:
    await _validate_category(db, payload.category_id)
    product = Product(tenant_id=tenant_id, **payload.model_dump())
    db.add(product)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductSkuConflictError(f"Ya existe un producto con el SKU '{payload.sku}'") from exc
    await db.refresh(product)
    # Recién creado no tiene variantes todavía, pero ProductRead
    # serializa `variants` -- sin cargar la relación acá, acceder a
    # product.variants durante ProductRead.model_validate() (fuera del
    # loop async de SQLAlchemy) tira MissingGreenlet.
    await db.refresh(product, attribute_names=["variants"])
    return product


async def list_products(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Product]:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.variants))
        .order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_product(db: AsyncSession, product_id: UUID, for_update: bool = False) -> Product:
    """Si product_id existe pero es de otro tenant, get_tenant_db ya lo
    excluyó de la query -- esto tira NotFound, no un 403. Es la
    respuesta correcta: no confirmarle a un tenant que el ID de otro
    tenant existe."""
    query = select(Product).options(selectinload(Product.variants)).where(Product.id == product_id)
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if product is None:
        raise ProductNotFoundError(f"Producto {product_id} no encontrado")
    return product


async def update_product(db: AsyncSession, product_id: UUID, payload: ProductUpdate) -> Product:
    # for_update=True: PATCH /products/{id} es también el endpoint de
    # ajuste manual de stock (current_stock). Sin el lock, un ajuste
    # manual concurrente con una venta (que sí lockea el producto en
    # sales/services.py) podía pisarse -- gana el último commit() y el
    # otro cambio se pierde en silencio, dejando el stock final mal.
    product = await get_product(db, product_id, for_update=True)
    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        await _validate_category(db, updates["category_id"])
    for field, value in updates.items():
        setattr(product, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductSkuConflictError(f"Ya existe un producto con el SKU '{updates.get('sku')}'") from exc
    await db.refresh(product)
    # commit() expira todos los atributos del objeto, incluyendo
    # `variants` (ya venía cargado por el selectinload de get_product)
    # -- hay que recargarlo explícito antes de que la ruta lo
    # serialice con ProductRead, mismo motivo que en create_product.
    await db.refresh(product, attribute_names=["variants"])
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


async def create_category(db: AsyncSession, tenant_id: UUID, payload: ProductCategoryCreate) -> ProductCategory:
    category = ProductCategory(tenant_id=tenant_id, **payload.model_dump())
    db.add(category)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductCategoryDuplicateNameError(f"Ya existe una categoría llamada '{payload.name}'") from exc
    await db.refresh(category)
    return category


async def list_categories(db: AsyncSession) -> list[ProductCategory]:
    result = await db.execute(select(ProductCategory).order_by(ProductCategory.created_at.desc()))
    return list(result.scalars().all())


async def delete_category(db: AsyncSession, category_id: UUID) -> None:
    result = await db.execute(select(ProductCategory).where(ProductCategory.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise ProductCategoryNotFoundError(f"Categoría {category_id} no encontrada")
    await db.delete(category)
    await db.commit()
    # Sin try/except IntegrityError: ondelete=SET NULL en
    # Product.category_id significa que Postgres nunca rechaza este
    # DELETE -- los productos que tenían esta categoría quedan con
    # category_id=NULL.


async def create_attribute(
    db: AsyncSession, tenant_id: UUID, payload: ProductAttributeCreate
) -> ProductAttribute:
    attribute = ProductAttribute(tenant_id=tenant_id, **payload.model_dump())
    db.add(attribute)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductAttributeDuplicateNameError(f"Ya existe un atributo llamado '{payload.name}'") from exc
    await db.refresh(attribute)
    await db.refresh(attribute, attribute_names=["values"])
    return attribute


async def list_attributes(db: AsyncSession) -> list[ProductAttribute]:
    result = await db.execute(
        select(ProductAttribute)
        .options(selectinload(ProductAttribute.values))
        .order_by(ProductAttribute.created_at.desc())
    )
    return list(result.scalars().all())


async def _get_attribute(db: AsyncSession, attribute_id: UUID) -> ProductAttribute:
    result = await db.execute(select(ProductAttribute).where(ProductAttribute.id == attribute_id))
    attribute = result.scalar_one_or_none()
    if attribute is None:
        raise ProductAttributeNotFoundError(f"Atributo {attribute_id} no encontrado")
    return attribute


async def delete_attribute(db: AsyncSession, attribute_id: UUID) -> None:
    attribute = await _get_attribute(db, attribute_id)
    await db.delete(attribute)
    await db.commit()


async def create_attribute_value(
    db: AsyncSession, tenant_id: UUID, attribute_id: UUID, payload: ProductAttributeValueCreate
) -> ProductAttributeValue:
    await _get_attribute(db, attribute_id)
    value = ProductAttributeValue(tenant_id=tenant_id, attribute_id=attribute_id, **payload.model_dump())
    db.add(value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductAttributeValueDuplicateError(
            f"El valor '{payload.value}' ya existe para este atributo"
        ) from exc
    await db.refresh(value)
    return value


async def delete_attribute_value(db: AsyncSession, attribute_id: UUID, value_id: UUID) -> None:
    result = await db.execute(
        select(ProductAttributeValue).where(
            ProductAttributeValue.id == value_id, ProductAttributeValue.attribute_id == attribute_id
        )
    )
    value = result.scalar_one_or_none()
    if value is None:
        raise ProductAttributeValueNotFoundError(f"Valor {value_id} no encontrado")
    await db.delete(value)
    await db.commit()


def _attributes_key(attributes: dict[str, str]) -> tuple:
    return tuple(sorted(attributes.items()))


async def get_variant(
    db: AsyncSession, product_id: UUID, variant_id: UUID, for_update: bool = False
) -> ProductVariant:
    """Filtra por product_id además de variant_id: una variante de otro
    producto (aunque sea del mismo tenant) no debe resolverse acá --
    evita que una URL con product_id "equivocado" pero variant_id
    válido devuelva datos de un producto distinto."""
    query = select(ProductVariant).where(
        ProductVariant.id == variant_id, ProductVariant.product_id == product_id
    )
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    variant = result.scalar_one_or_none()
    if variant is None:
        raise ProductVariantNotFoundError(f"Variante {variant_id} no encontrada")
    return variant


async def create_variant(
    db: AsyncSession, tenant_id: UUID, product_id: UUID, payload: ProductVariantCreate
) -> ProductVariant:
    product = await get_product(db, product_id)
    combo = _attributes_key(payload.attributes)
    if combo and combo in {_attributes_key(v.attributes) for v in product.variants}:
        raise ProductVariantAttributesConflictError(
            f"Ya existe una variante de este producto con esa combinación de atributos: {dict(combo)}"
        )
    variant = ProductVariant(tenant_id=tenant_id, product_id=product_id, **payload.model_dump())
    db.add(variant)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductVariantSkuConflictError(
            f"Ya existe una variante con el SKU '{payload.sku}' para este producto"
        ) from exc
    await db.refresh(variant)
    return variant


async def create_variants_bulk(
    db: AsyncSession, tenant_id: UUID, product_id: UUID, payload: ProductVariantBulkCreate
) -> list[ProductVariant]:
    """Crea todas las variantes del lote en una sola transacción: si
    alguna falla (SKU duplicado, etc.), ninguna se crea."""
    product = await get_product(db, product_id)

    seen_skus: set[str] = set()
    # Combinaciones de atributos ya existentes en el producto (no hay
    # UniqueConstraint para esto en la base -- attributes es JSONB
    # libre -- así que se valida acá antes de insertar, contra lo ya
    # existente Y contra el resto del lote.
    seen_combos: set[tuple] = {_attributes_key(v.attributes) for v in product.variants}
    for item in payload.variants:
        sku = (item.sku or "").strip()
        if sku and sku in seen_skus:
            raise ProductVariantDuplicateError(f"El SKU '{sku}' está repetido en el lote")
        if sku:
            seen_skus.add(sku)

        combo = _attributes_key(item.attributes)
        if combo and combo in seen_combos:
            raise ProductVariantAttributesConflictError(
                f"La combinación de atributos {dict(combo)} está repetida (o ya existe para este producto)"
            )
        if combo:
            seen_combos.add(combo)

    variants = [
        ProductVariant(tenant_id=tenant_id, product_id=product_id, **item.model_dump())
        for item in payload.variants
    ]
    db.add_all(variants)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductVariantSkuConflictError(
            "Uno o más SKUs del lote ya existen para este producto"
        ) from exc
    for variant in variants:
        await db.refresh(variant)
    return variants


async def update_variant(
    db: AsyncSession, product_id: UUID, variant_id: UUID, payload: ProductVariantUpdate
) -> ProductVariant:
    # for_update=True: mismo motivo que update_product -- este endpoint
    # también es el de ajuste manual de stock por variante.
    variant = await get_variant(db, product_id, variant_id, for_update=True)
    updates = payload.model_dump(exclude_unset=True)
    if "attributes" in updates:
        product = await get_product(db, product_id)
        combo = _attributes_key(updates["attributes"])
        other_combos = {
            _attributes_key(v.attributes) for v in product.variants if v.id != variant_id
        }
        if combo and combo in other_combos:
            raise ProductVariantAttributesConflictError(
                f"Ya existe otra variante de este producto con esa combinación de atributos: {dict(combo)}"
            )
    for field, value in updates.items():
        setattr(variant, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ProductVariantSkuConflictError(
            f"Ya existe una variante con el SKU '{updates.get('sku')}' para este producto"
        ) from exc
    await db.refresh(variant)
    return variant


async def delete_variant(db: AsyncSession, product_id: UUID, variant_id: UUID) -> None:
    variant = await get_variant(db, product_id, variant_id)
    await db.delete(variant)
    await db.commit()
