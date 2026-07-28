from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import UserRole
from app.modules.treasury.schemas import (
    AccountMovementRead,
    CashMovementCreate,
    CashMovementRead,
    CashSessionClose,
    CashSessionOpen,
    CashSessionRead,
    CustomerAccountRead,
    CustomerBalanceRead,
    CustomerPaymentCreate,
    PaymentMethodSummary,
)
from app.modules.treasury.services import (
    CashSessionAlreadyClosedError,
    CashSessionAlreadyOpenError,
    CashSessionNotFoundError,
    CustomerNotFoundError,
    add_cash_movement,
    close_cash_session,
    get_cash_session,
    get_cash_session_sales_summary,
    get_customer_account,
    get_open_cash_session,
    list_customer_balances,
    open_cash_session,
    record_customer_payment,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


@router.get("/customer-accounts", response_model=list[CustomerBalanceRead])
async def list_customer_accounts_endpoint(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[CustomerBalanceRead]:
    """Vista general de cuenta corriente: un renglón por cliente con su
    saldo, para no tener que entrar a cada uno por separado. Path
    literal aparte de /customers/{customer_id}/account a propósito --
    evita cualquier ambigüedad de ruteo con el UUID."""
    rows = await list_customer_balances(db)
    return [
        CustomerBalanceRead(
            customer_id=customer.id,
            customer_name=customer.name,
            balance=balance,
            credit_limit=float(customer.credit_limit) if customer.credit_limit is not None else None,
        )
        for customer, balance in rows
    ]


@router.get("/customers/{customer_id}/account", response_model=CustomerAccountRead)
async def get_customer_account_endpoint(
    customer_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> CustomerAccountRead:
    try:
        balance, movements = await get_customer_account(db, customer_id)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CustomerAccountRead(
        customer_id=customer_id,
        balance=balance,
        movements=[AccountMovementRead.model_validate(m) for m in movements],
    )


@router.post("/customers/{customer_id}/payments", response_model=AccountMovementRead, status_code=201)
async def create_customer_payment_endpoint(
    customer_id: UUID,
    payload: CustomerPaymentCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> AccountMovementRead:
    try:
        movement = await record_customer_payment(
            db, current_user.tenant_id, customer_id, payload.amount, payload.payment_method, payload.description
        )
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AccountMovementRead.model_validate(movement)


# Registrada ANTES de "/cash/sessions/{session_id}": mismo motivo que
# /customers/types y /products/attributes -- "current" no es un UUID
# válido, tiene que matchear como ruta literal primero.
@router.get("/cash/sessions/current", response_model=Optional[CashSessionRead])
async def get_current_cash_session_endpoint(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> CashSessionRead | None:
    session = await get_open_cash_session(db, current_user.tenant_id)
    return CashSessionRead.model_validate(session) if session else None


@router.post("/cash/sessions", response_model=CashSessionRead, status_code=201)
async def open_cash_session_endpoint(
    payload: CashSessionOpen,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CashSessionRead:
    try:
        session = await open_cash_session(db, current_user.tenant_id, current_user.user_id, payload.opening_amount)
    except CashSessionAlreadyOpenError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return CashSessionRead.model_validate(session)


@router.get("/cash/sessions/{session_id}", response_model=CashSessionRead)
async def get_cash_session_endpoint(
    session_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> CashSessionRead:
    try:
        session = await get_cash_session(db, session_id)
    except CashSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CashSessionRead.model_validate(session)


@router.get("/cash/sessions/{session_id}/sales-summary", response_model=list[PaymentMethodSummary])
async def get_cash_session_sales_summary_endpoint(
    session_id: UUID,
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[PaymentMethodSummary]:
    try:
        summary = await get_cash_session_sales_summary(db, session_id)
    except CashSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [PaymentMethodSummary(**row) for row in summary]


@router.post("/cash/sessions/{session_id}/movements", response_model=CashMovementRead, status_code=201)
async def add_cash_movement_endpoint(
    session_id: UUID,
    payload: CashMovementCreate,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CashMovementRead:
    try:
        movement = await add_cash_movement(
            db, current_user.tenant_id, session_id, payload.type, payload.amount, payload.description
        )
    except CashSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CashSessionAlreadyClosedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return CashMovementRead.model_validate(movement)


@router.post("/cash/sessions/{session_id}/close", response_model=CashSessionRead)
async def close_cash_session_endpoint(
    session_id: UUID,
    payload: CashSessionClose,
    current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> CashSessionRead:
    try:
        session = await close_cash_session(db, session_id, current_user.user_id, payload.closing_amount_declared)
    except CashSessionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CashSessionAlreadyClosedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return CashSessionRead.model_validate(session)
