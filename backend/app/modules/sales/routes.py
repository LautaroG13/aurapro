from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.sales.schemas import SaleCreate, SaleRead
from app.modules.sales.services import (
    CustomerNotFoundError,
    InsufficientStockError,
    ProductNotFoundError,
    SaleNotFoundError,
    create_sale,
    get_sale,
    list_sales,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


@router.post("", response_model=SaleRead, status_code=201)
async def create_sale_endpoint(
    payload: SaleCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> SaleRead:
    try:
        sale = await create_sale(db, current_user.tenant_id, payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InsufficientStockError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return SaleRead.model_validate(sale)


@router.get("", response_model=list[SaleRead])
async def list_sales_endpoint(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[SaleRead]:
    sales = await list_sales(db, skip=skip, limit=limit)
    return [SaleRead.model_validate(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleRead)
async def get_sale_endpoint(
    sale_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> SaleRead:
    try:
        sale = await get_sale(db, sale_id)
    except SaleNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SaleRead.model_validate(sale)
