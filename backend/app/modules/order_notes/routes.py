from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.identity.services import get_tenant
from app.modules.order_notes.pdf import build_order_note_pdf
from app.modules.order_notes.schemas import OrderNoteCreate, OrderNoteRead, OrderNoteStatusUpdate
from app.modules.order_notes.services import (
    CannotSetInvoicedManuallyError,
    CustomerNotFoundError,
    OrderNoteNotFoundError,
    OrderNoteNotPendingError,
    ProductNotFoundError,
    ProductVariantNotFoundError,
    VariantProductMismatchError,
    create_order_note,
    get_order_note,
    list_order_notes,
    update_order_note_status,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


@router.post("", response_model=OrderNoteRead, status_code=201)
async def create_order_note_endpoint(
    payload: OrderNoteCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> OrderNoteRead:
    try:
        order_note = await create_order_note(db, current_user.tenant_id, payload)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ProductVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except VariantProductMismatchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return OrderNoteRead.model_validate(order_note)


@router.get("", response_model=list[OrderNoteRead])
async def list_order_notes_endpoint(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[OrderNoteRead]:
    order_notes = await list_order_notes(db, skip=skip, limit=limit)
    return [OrderNoteRead.model_validate(o) for o in order_notes]


@router.get("/{order_note_id}", response_model=OrderNoteRead)
async def get_order_note_endpoint(
    order_note_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> OrderNoteRead:
    try:
        order_note = await get_order_note(db, order_note_id)
    except OrderNoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return OrderNoteRead.model_validate(order_note)


@router.patch("/{order_note_id}/status", response_model=OrderNoteRead)
async def update_order_note_status_endpoint(
    order_note_id: UUID,
    payload: OrderNoteStatusUpdate,
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> OrderNoteRead:
    try:
        order_note = await update_order_note_status(db, order_note_id, payload.status)
    except OrderNoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except OrderNoteNotPendingError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except CannotSetInvoicedManuallyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return OrderNoteRead.model_validate(order_note)


@router.get("/{order_note_id}/receipt")
async def get_order_note_receipt_endpoint(
    order_note_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    try:
        order_note = await get_order_note(db, order_note_id)
    except OrderNoteNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    tenant = await get_tenant(db, current_user.tenant_id)
    pdf_bytes = build_order_note_pdf(order_note, tenant=tenant, customer_name=order_note.customer.name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="nota-pedido-{order_note.order_note_number:06d}.pdf"'
        },
    )
