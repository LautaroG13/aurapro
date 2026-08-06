"""Agregaciones de negocio para el dashboard (home). Todo lee
directo de Postgres vía la sesión tenant-scoped (get_tenant_db) --
a diferencia de analytics.py/stock_alerts.py, nada de esto pasa por
Redis ni depende de analytics-engine, así que no hace falta Kafka ni
el forecast levantados para que el dashboard funcione.

Solo cuentan ventas COMPLETED -- una PENDING o CANCELLED no es
ingreso real todavía/nunca.
"""

from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product
from app.modules.sales.models import Sale, SaleItem, SaleStatus
from app.modules.treasury.models import AccountMovement, AccountMovementType
from app.schemas.dashboard import DashboardSummary, PaymentMethodTotal, RevenuePoint, TopProduct

LOW_STOCK_THRESHOLD = 5


async def get_summary(db: AsyncSession) -> DashboardSummary:
    today_start = func.date_trunc("day", func.now())
    month_start = func.date_trunc("month", func.now())

    revenue_today_row = await db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0), func.count(Sale.id)).where(
            Sale.status == SaleStatus.COMPLETED, Sale.created_at >= today_start
        )
    )
    revenue_today, sales_today_count = revenue_today_row.one()

    revenue_month_row = await db.execute(
        select(func.coalesce(func.sum(Sale.total_amount), 0), func.count(Sale.id)).where(
            Sale.status == SaleStatus.COMPLETED, Sale.created_at >= month_start
        )
    )
    revenue_month, sales_month_count = revenue_month_row.one()
    average_ticket_month = float(revenue_month) / sales_month_count if sales_month_count else 0.0

    # Deuda total: por cliente, saldo = debitos - creditos, pero un
    # cliente con saldo a favor (negativo) no debe "restar" contra la
    # deuda de otros -- se clampea a 0 antes de sumar.
    debit = case((AccountMovement.type == AccountMovementType.DEBIT, AccountMovement.amount), else_=0)
    credit = case((AccountMovement.type == AccountMovementType.CREDIT, AccountMovement.amount), else_=0)
    balance_per_customer = (
        select(
            AccountMovement.customer_id,
            (func.coalesce(func.sum(debit), 0) - func.coalesce(func.sum(credit), 0)).label("balance"),
        )
        .group_by(AccountMovement.customer_id)
        .subquery()
    )
    debt_row = await db.execute(select(func.coalesce(func.sum(func.greatest(balance_per_customer.c.balance, 0)), 0)))
    customer_debt_total = debt_row.scalar_one()

    low_stock_row = await db.execute(
        select(func.count(Product.id)).where(Product.is_active.is_(True), Product.current_stock <= LOW_STOCK_THRESHOLD)
    )
    low_stock_count = low_stock_row.scalar_one()

    return DashboardSummary(
        revenue_today=float(revenue_today),
        revenue_month=float(revenue_month),
        sales_today_count=sales_today_count,
        average_ticket_month=average_ticket_month,
        customer_debt_total=float(customer_debt_total),
        low_stock_count=low_stock_count,
    )


async def get_revenue_timeseries(db: AsyncSession, days: int) -> list[RevenuePoint]:
    day = func.date_trunc("day", Sale.created_at)
    window_start = func.date_trunc("day", func.now()) - func.make_interval(0, 0, 0, days - 1)
    result = await db.execute(
        select(day.label("day"), func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= window_start)
        .group_by(day)
        .order_by(day)
    )
    by_day = {row[0].date(): float(row[1]) for row in result.all()}

    today = date.today()
    points: list[RevenuePoint] = []
    for offset in range(days - 1, -1, -1):
        day_value = today.fromordinal(today.toordinal() - offset)
        points.append(RevenuePoint(date=day_value, total=by_day.get(day_value, 0.0)))
    return points


async def get_top_products(db: AsyncSession, limit: int, days: int) -> list[TopProduct]:
    window_start = func.date_trunc("day", func.now()) - func.make_interval(0, 0, 0, days - 1)
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            func.sum(SaleItem.quantity),
            func.sum(SaleItem.quantity * SaleItem.unit_price),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= window_start)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(SaleItem.quantity * SaleItem.unit_price).desc())
        .limit(limit)
    )
    return [
        TopProduct(product_id=str(product_id), product_name=name, quantity=int(quantity), revenue=float(revenue))
        for product_id, name, quantity, revenue in result.all()
    ]


async def get_payment_method_totals(db: AsyncSession, days: int) -> list[PaymentMethodTotal]:
    window_start = func.date_trunc("day", func.now()) - func.make_interval(0, 0, 0, days - 1)
    result = await db.execute(
        select(Sale.payment_method, func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= window_start)
        .group_by(Sale.payment_method)
        .order_by(func.sum(Sale.total_amount).desc())
    )
    return [PaymentMethodTotal(payment_method=method, total=float(total)) for method, total in result.all()]
