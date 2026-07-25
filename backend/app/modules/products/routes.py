from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.products.schemas import (
    ProductAttributeCreate,
    ProductAttributeRead,
    ProductAttributeValueCreate,
    ProductAttributeValueRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    ProductVariantBulkCreate,
    ProductVariantCreate,
    ProductVariantRead,
    ProductVariantUpdate,
)
from app.modules.products.services import (
    ProductAttributeDuplicateNameError,
    ProductAttributeNotFoundError,
    ProductAttributeValueDuplicateError,
    ProductAttributeValueNotFoundError,
    ProductInUseError,
    ProductNotFoundError,
    ProductVariantDuplicateError,
    ProductVariantNotFoundError,
    ProductVariantSkuConflictError,
    create_attribute,
    create_attribute_value,
    create_product,
    create_variant,
    create_variants_bulk,
    delete_attribute,
    delete_attribute_value,
    delete_product,
    delete_variant,
    get_product,
    list_attributes,
    list_products,
    update_product,
    update_variant,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


# Registradas ANTES de "/{product_id}": mismo motivo que /customers/types
# (ver ese router) -- si no, "GET /products/attributes" matchearía contra
# "GET /{product_id}" primero y tiraría 422 al validar "attributes" como UUID.
@router.post("/attributes", response_model=ProductAttributeRead, status_code=201)
async def create_attribute_endpoint(
    payload: ProductAttributeCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductAttributeRead:
    try:
        attribute = await create_attribute(db, current_user.tenant_id, payload)
    except ProductAttributeDuplicateNameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return ProductAttributeRead.model_validate(attribute)


@router.get("/attributes", response_model=list[ProductAttributeRead])
async def list_attributes_endpoint(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[ProductAttributeRead]:
    attributes = await list_attributes(db)
    return [ProductAttributeRead.model_validate(a) for a in attributes]


@router.delete("/attributes/{attribute_id}", status_code=204)
async def delete_attribute_endpoint(
    attribute_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_attribute(db, attribute_id)
    except ProductAttributeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/attributes/{attribute_id}/values", response_model=ProductAttributeValueRead, status_code=201)
async def create_attribute_value_endpoint(
    attribute_id: UUID,
    payload: ProductAttributeValueCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductAttributeValueRead:
    try:
        value = await create_attribute_value(db, current_user.tenant_id, attribute_id, payload)
    except ProductAttributeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductAttributeValueDuplicateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return ProductAttributeValueRead.model_validate(value)


@router.delete("/attributes/{attribute_id}/values/{value_id}", status_code=204)
async def delete_attribute_value_endpoint(
    attribute_id: UUID,
    value_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_attribute_value(db, attribute_id, value_id)
    except ProductAttributeValueNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=ProductRead, status_code=201)
async def create_product_endpoint(
    payload: ProductCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductRead:
    product = await create_product(db, current_user.tenant_id, payload)
    return ProductRead.model_validate(product)


@router.get("", response_model=list[ProductRead])
async def list_products_endpoint(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[ProductRead]:
    products = await list_products(db, skip=skip, limit=limit)
    return [ProductRead.model_validate(p) for p in products]


@router.get("/{product_id}", response_model=ProductRead)
async def get_product_endpoint(
    product_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductRead:
    try:
        product = await get_product(db, product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product_endpoint(
    product_id: UUID,
    payload: ProductUpdate,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductRead:
    try:
        product = await update_product(db, product_id, payload)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductRead.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product_endpoint(
    product_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_product(db, product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductInUseError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{product_id}/variants", response_model=ProductVariantRead, status_code=201)
async def create_variant_endpoint(
    product_id: UUID,
    payload: ProductVariantCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductVariantRead:
    try:
        variant = await create_variant(db, current_user.tenant_id, product_id, payload)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductVariantRead.model_validate(variant)


@router.post("/{product_id}/variants/bulk", response_model=list[ProductVariantRead], status_code=201)
async def create_variants_bulk_endpoint(
    product_id: UUID,
    payload: ProductVariantBulkCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[ProductVariantRead]:
    try:
        variants = await create_variants_bulk(db, current_user.tenant_id, product_id, payload)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductVariantDuplicateError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ProductVariantSkuConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return [ProductVariantRead.model_validate(v) for v in variants]


@router.patch("/{product_id}/variants/{variant_id}", response_model=ProductVariantRead)
async def update_variant_endpoint(
    product_id: UUID,
    variant_id: UUID,
    payload: ProductVariantUpdate,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProductVariantRead:
    try:
        variant = await update_variant(db, product_id, variant_id, payload)
    except ProductVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductVariantRead.model_validate(variant)


@router.delete("/{product_id}/variants/{variant_id}", status_code=204)
async def delete_variant_endpoint(
    product_id: UUID,
    variant_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_variant(db, product_id, variant_id)
    except ProductVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
