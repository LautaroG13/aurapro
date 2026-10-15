from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user
from app.schemas.dashboard import DashboardSummary, PaymentMethodTotal, RevenuePoint, TopProduct
from app.services import dashboard as dashboard_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def summary(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> DashboardSummary:
    return await dashboard_service.get_summary(db)


@router.get("/revenue-timeseries", response_model=list[RevenuePoint])
async def revenue_timeseries(
    days: int = Query(default=14, ge=1, le=90),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[RevenuePoint]:
    return await dashboard_service.get_revenue_timeseries(db, days)


@router.get("/top-products", response_model=list[TopProduct])
async def top_products(
    limit: int = Query(default=5, ge=1, le=20),
    days: int = Query(default=30, ge=1, le=365),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[TopProduct]:
    return await dashboard_service.get_top_products(db, limit, days)


@router.get("/payment-methods", response_model=list[PaymentMethodTotal])
async def payment_methods(
    days: int = Query(default=30, ge=1, le=365),
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[PaymentMethodTotal]:
    return await dashboard_service.get_payment_method_totals(db, days)
