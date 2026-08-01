from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.identity.services import get_tenant
from app.modules.order_notes.services import (
    OrderNoteCustomerMismatchError,
    OrderNoteNotFoundError,
    OrderNoteNotPendingError,
)
from app.modules.sales.pdf import build_sale_receipt_pdf
from app.modules.sales.schemas import SaleCreate, SaleRead
from app.modules.sales.services import (
    CustomerNotFoundError,
    InsufficientCreditError,
    InsufficientStockError,
    ProductNotActiveError,
    ProductNotFoundError,
    ProductVariantNotFoundError,
    SaleNotFoundError,
    VariantProductMismatchError,
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
    except ProductNotActiveError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ProductVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except VariantProductMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except InsufficientStockError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InsufficientCreditError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except OrderNoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except OrderNoteNotPendingError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except OrderNoteCustomerMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
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


@router.get("/{sale_id}/receipt")
async def get_sale_receipt_endpoint(
    sale_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    try:
        sale = await get_sale(db, sale_id)
    except SaleNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    tenant = await get_tenant(db, current_user.tenant_id)
    pdf_bytes = build_sale_receipt_pdf(sale, tenant=tenant, customer_name=sale.customer.name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="venta-{sale.sale_number:06d}.pdf"'},
    )
