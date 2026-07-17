from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerRead,
    CustomerTypeCreate,
    CustomerTypeRead,
    CustomerUpdate,
)
from app.modules.customers.services import (
    CustomerInUseError,
    CustomerNotFoundError,
    CustomerTypeDuplicateNameError,
    CustomerTypeNotFoundError,
    InvalidCustomerTypeError,
    InvalidSalespersonError,
    create_customer,
    create_customer_type,
    delete_customer,
    delete_customer_type,
    get_customer,
    list_customer_types,
    list_customers,
    update_customer,
)
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


# Registradas ANTES de "/{customer_id}": si fueran después, "GET
# /customers/types" matchearía contra "GET /{customer_id}" primero (con
# customer_id="types") y tiraría 422 por fallar la validación de UUID
# en vez de llegar acá. El orden de declaración importa en FastAPI.
@router.post("/types", response_model=CustomerTypeRead, status_code=201)
async def create_customer_type_endpoint(
    payload: CustomerTypeCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CustomerTypeRead:
    try:
        customer_type = await create_customer_type(db, current_user.tenant_id, payload)
    except CustomerTypeDuplicateNameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return CustomerTypeRead.model_validate(customer_type)


@router.get("/types", response_model=list[CustomerTypeRead])
async def list_customer_types_endpoint(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[CustomerTypeRead]:
    customer_types = await list_customer_types(db)
    return [CustomerTypeRead.model_validate(t) for t in customer_types]


@router.delete("/types/{type_id}", status_code=204)
async def delete_customer_type_endpoint(
    type_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_customer_type(db, type_id)
    except CustomerTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=CustomerRead, status_code=201)
async def create_customer_endpoint(
    payload: CustomerCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CustomerRead:
    try:
        customer = await create_customer(db, current_user.tenant_id, payload)
    except InvalidSalespersonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except InvalidCustomerTypeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CustomerRead.model_validate(customer)


@router.get("", response_model=list[CustomerRead])
async def list_customers_endpoint(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[CustomerRead]:
    customers = await list_customers(db, skip=skip, limit=limit)
    return [CustomerRead.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer_endpoint(
    customer_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> CustomerRead:
    try:
        customer = await get_customer(db, customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CustomerRead.model_validate(customer)


@router.patch("/{customer_id}", response_model=CustomerRead)
async def update_customer_endpoint(
    customer_id: UUID,
    payload: CustomerUpdate,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CustomerRead:
    try:
        customer = await update_customer(db, customer_id, payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidSalespersonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except InvalidCustomerTypeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CustomerRead.model_validate(customer)


@router.delete("/{customer_id}", status_code=204)
async def delete_customer_endpoint(
    customer_id: UUID,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_customer(db, customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CustomerInUseError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
