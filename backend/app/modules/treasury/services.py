"""Cuenta corriente de clientes + caja diaria.

`record_sale_on_account` y `record_cash_income_from_sale` se llaman
DESDE `sales/services.py::create_sale`, dentro de la misma transacción
de la venta -- nunca hacen `db.commit()` ellas mismas. Así, si el
crédito no alcanza (`InsufficientCreditError`), la excepción aborta la
venta entera junto con el movimiento a medio armar: nunca queda una
venta sin su movimiento de cuenta corriente, ni un movimiento sin su
venta."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.customers.models import Customer
from app.modules.sales.models import Sale
from app.modules.treasury.models import (
    AccountMovement,
    AccountMovementType,
    CashMovement,
    CashMovementType,
    CashSession,
    CashSessionStatus,
)

CASH_PAYMENT_METHOD = "cash"


class CustomerNotFoundError(Exception):
    pass


class InsufficientCreditError(Exception):
    pass


class CashSessionAlreadyOpenError(Exception):
    pass


class CashSessionNotFoundError(Exception):
    pass


class CashSessionAlreadyClosedError(Exception):
    pass


async def get_customer_balance(db: AsyncSession, customer_id: UUID) -> float:
    debit = case((AccountMovement.type == AccountMovementType.DEBIT, AccountMovement.amount), else_=0)
    credit = case((AccountMovement.type == AccountMovementType.CREDIT, AccountMovement.amount), else_=0)
    result = await db.execute(
        select(func.coalesce(func.sum(debit), 0) - func.coalesce(func.sum(credit), 0)).where(
            AccountMovement.customer_id == customer_id
        )
    )
    return float(result.scalar_one())


async def _get_customer(db: AsyncSession, customer_id: UUID) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {customer_id} no encontrado")
    return customer


async def get_customer_account(db: AsyncSession, customer_id: UUID) -> tuple[float, list[AccountMovement]]:
    await _get_customer(db, customer_id)
    balance = await get_customer_balance(db, customer_id)
    result = await db.execute(
        select(AccountMovement)
        .where(AccountMovement.customer_id == customer_id)
        .order_by(AccountMovement.created_at.desc())
    )
    return balance, list(result.scalars().all())


async def record_sale_on_account(db: AsyncSession, tenant_id: UUID, customer: Customer, sale) -> None:
    if customer.credit_limit is not None:
        balance = await get_customer_balance(db, customer.id)
        total = float(sale.total_amount)
        limit = float(customer.credit_limit)
        if balance + total > limit:
            raise InsufficientCreditError(
                f"'{customer.name}' no tiene crédito suficiente: saldo {balance:.2f} + "
                f"venta {total:.2f} superaría el límite {limit:.2f}"
            )
    db.add(
        AccountMovement(
            tenant_id=tenant_id,
            customer_id=customer.id,
            type=AccountMovementType.DEBIT,
            amount=sale.total_amount,
            description="Venta",
            sale_id=sale.id,
        )
    )


async def record_cash_income_from_sale(db: AsyncSession, tenant_id: UUID, sale) -> None:
    """Si no hay caja abierta, no hace nada -- vender en efectivo sin
    caja abierta no debe bloquear la venta (decisión de producto)."""
    session = await get_open_cash_session(db, tenant_id)
    if session is None:
        return
    db.add(
        CashMovement(
            tenant_id=tenant_id,
            cash_session_id=session.id,
            type=CashMovementType.INCOME,
            amount=sale.total_amount,
            description="Venta",
            sale_id=sale.id,
        )
    )


async def record_customer_payment(
    db: AsyncSession,
    tenant_id: UUID,
    customer_id: UUID,
    amount: float,
    payment_method: str,
    description: str | None,
) -> AccountMovement:
    await _get_customer(db, customer_id)
    movement = AccountMovement(
        tenant_id=tenant_id,
        customer_id=customer_id,
        type=AccountMovementType.CREDIT,
        amount=amount,
        description=description or "Cobro",
    )
    db.add(movement)
    if payment_method == CASH_PAYMENT_METHOD:
        session = await get_open_cash_session(db, tenant_id)
        if session is not None:
            db.add(
                CashMovement(
                    tenant_id=tenant_id,
                    cash_session_id=session.id,
                    type=CashMovementType.INCOME,
                    amount=amount,
                    description="Cobro de cuenta corriente",
                )
            )
    await db.commit()
    await db.refresh(movement)
    return movement


async def get_open_cash_session(db: AsyncSession, tenant_id: UUID) -> CashSession | None:
    result = await db.execute(
        select(CashSession)
        .options(selectinload(CashSession.movements))
        .where(CashSession.status == CashSessionStatus.OPEN)
    )
    return result.scalar_one_or_none()


async def open_cash_session(db: AsyncSession, tenant_id: UUID, user_id: UUID, opening_amount: float) -> CashSession:
    existing = await get_open_cash_session(db, tenant_id)
    if existing is not None:
        raise CashSessionAlreadyOpenError("Ya hay una caja abierta para este tenant")
    session = CashSession(tenant_id=tenant_id, opening_amount=opening_amount, opened_by_user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    await db.refresh(session, attribute_names=["movements"])
    return session


async def _get_cash_session(db: AsyncSession, session_id: UUID) -> CashSession:
    result = await db.execute(
        select(CashSession).options(selectinload(CashSession.movements)).where(CashSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise CashSessionNotFoundError(f"Caja {session_id} no encontrada")
    return session


async def get_cash_session(db: AsyncSession, session_id: UUID) -> CashSession:
    return await _get_cash_session(db, session_id)


async def add_cash_movement(
    db: AsyncSession,
    tenant_id: UUID,
    session_id: UUID,
    movement_type: CashMovementType,
    amount: float,
    description: str | None,
) -> CashMovement:
    session = await _get_cash_session(db, session_id)
    if session.status == CashSessionStatus.CLOSED:
        raise CashSessionAlreadyClosedError(f"La caja {session_id} ya está cerrada")
    movement = CashMovement(
        tenant_id=tenant_id,
        cash_session_id=session_id,
        type=movement_type,
        amount=amount,
        description=description,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement


async def get_cash_session_sales_summary(db: AsyncSession, session_id: UUID) -> list[dict]:
    """Ventas del tenant creadas durante la ventana de esta caja
    (apertura -> cierre, o apertura -> ahora si sigue abierta),
    agrupadas por payment_method. A diferencia de CashMovement (que
    solo trackea efectivo físico), este reporte cubre TODOS los medios
    de pago -- tarjeta y transferencia incluidos."""
    session = await _get_cash_session(db, session_id)
    window_end = session.closed_at or datetime.now(timezone.utc)
    result = await db.execute(
        select(Sale.payment_method, func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.created_at >= session.created_at, Sale.created_at <= window_end)
        .group_by(Sale.payment_method)
    )
    return [
        {"payment_method": payment_method, "count": count, "total_amount": float(total)}
        for payment_method, count, total in result.all()
    ]


async def close_cash_session(
    db: AsyncSession, session_id: UUID, user_id: UUID, closing_amount_declared: float
) -> CashSession:
    session = await _get_cash_session(db, session_id)
    if session.status == CashSessionStatus.CLOSED:
        raise CashSessionAlreadyClosedError(f"La caja {session_id} ya está cerrada")

    income = sum(float(m.amount) for m in session.movements if m.type == CashMovementType.INCOME)
    expense = sum(float(m.amount) for m in session.movements if m.type == CashMovementType.EXPENSE)
    expected = float(session.opening_amount) + income - expense

    session.status = CashSessionStatus.CLOSED
    session.closed_by_user_id = user_id
    session.closed_at = datetime.now(timezone.utc)
    session.closing_amount_declared = closing_amount_declared
    session.closing_amount_expected = expected
    await db.commit()
    await db.refresh(session)
    await db.refresh(session, attribute_names=["movements"])
    return session
