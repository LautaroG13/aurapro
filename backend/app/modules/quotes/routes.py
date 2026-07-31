from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.identity.services import get_tenant
from app.modules.quotes.pdf import build_quote_pdf
from app.modules.quotes.schemas import QuoteCreate, QuoteRead, QuoteStatusUpdate
from app.modules.quotes.services import (
    CustomerNotFoundError,
    ProductNotFoundError,
    ProductVariantNotFoundError,
    QuoteNotFoundError,
    QuoteNotPendingError,
    VariantProductMismatchError,
    create_quote,
    get_quote,
    list_quotes,
    update_quote_status,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


@router.post("", response_model=QuoteRead, status_code=201)
async def create_quote_endpoint(
    payload: QuoteCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> QuoteRead:
    try:
        quote = await create_quote(db, current_user.tenant_id, payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except VariantProductMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return QuoteRead.model_validate(quote)


@router.get("", response_model=list[QuoteRead])
async def list_quotes_endpoint(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[QuoteRead]:
    quotes = await list_quotes(db, skip=skip, limit=limit)
    return [QuoteRead.model_validate(q) for q in quotes]


@router.get("/{quote_id}", response_model=QuoteRead)
async def get_quote_endpoint(
    quote_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> QuoteRead:
    try:
        quote = await get_quote(db, quote_id)
    except QuoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return QuoteRead.model_validate(quote)


@router.patch("/{quote_id}/status", response_model=QuoteRead)
async def update_quote_status_endpoint(
    quote_id: UUID,
    payload: QuoteStatusUpdate,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> QuoteRead:
    try:
        quote = await update_quote_status(db, quote_id, payload.status)
    except QuoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except QuoteNotPendingError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return QuoteRead.model_validate(quote)


@router.get("/{quote_id}/receipt")
async def get_quote_receipt_endpoint(
    quote_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    try:
        quote = await get_quote(db, quote_id)
    except QuoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    tenant = await get_tenant(db, current_user.tenant_id)
    pdf_bytes = build_quote_pdf(quote, tenant=tenant, customer_name=quote.customer.name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="presupuesto-{quote.quote_number:06d}.pdf"'},
    )
