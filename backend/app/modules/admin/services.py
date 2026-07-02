"""Todas las funciones acá asumen que `db` es una sesión SIN el filtro
de tenant (get_tenant_db se lo devuelve así solo si
request.state.is_superadmin es True -- ver app/db/tenant_session.py).
No hay chequeo redundante de is_superadmin en este archivo: la
autorización ya se decidió en la capa de rutas
(Depends(require_superadmin)) antes de llegar acá."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.schemas import GlobalStats, TenantSummary
from app.modules.customers.models import Customer
from app.modules.identity.models import Tenant, User
from app.modules.identity.services import register_tenant
from app.modules.products.models import Product
from app.modules.sales.models import Sale


class TenantNotFoundError(Exception):
    pass


async def list_all_tenants(db: AsyncSession) -> list[TenantSummary]:
    """Tenant no hereda TenantModel (no tiene tenant_id) -- ninguna
    sesión lo "filtra" nunca, con o sin superadmin. Esta lectura
    cross-tenant es legítima por diseño, no un efecto del bypass."""
    result = await db.execute(
        select(Tenant, func.count(User.id))
        .outerjoin(User, User.tenant_id == Tenant.id)
        .group_by(Tenant.id)
        .order_by(Tenant.created_at.desc())
    )
    return [
        TenantSummary(
            id=tenant.id,
            name=tenant.name,
            created_at=tenant.created_at,
            user_count=count,
            is_active=tenant.is_active,
        )
        for tenant, count in result.all()
    ]


async def create_tenant_as_admin(
    db: AsyncSession, tenant_name: str, admin_email: str, admin_password: str
) -> TenantSummary:
    tenant, _admin_user = await register_tenant(db, tenant_name, admin_email, admin_password)
    return TenantSummary(
        id=tenant.id, name=tenant.name, created_at=tenant.created_at, user_count=1, is_active=tenant.is_active
    )


async def set_tenant_active(db: AsyncSession, tenant_id: UUID, is_active: bool) -> TenantSummary:
    tenant = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
    if tenant is None:
        raise TenantNotFoundError(f"Tenant {tenant_id} no encontrado")

    tenant.is_active = is_active
    await db.commit()
    await db.refresh(tenant)

    user_count = (
        await db.execute(select(func.count()).select_from(User).where(User.tenant_id == tenant_id))
    ).scalar_one()
    return TenantSummary(
        id=tenant.id, name=tenant.name, created_at=tenant.created_at, user_count=user_count, is_active=tenant.is_active
    )


async def get_global_stats(db: AsyncSession) -> GlobalStats:
    """Cada COUNT(*) acá es sobre TODAS las filas de la tabla, de todos
    los tenants -- solo tiene sentido si `db` es la sesión sin filtro.
    Con una sesión tenant-scoped normal, esto devolvería solo los
    números del tenant del caller, no números globales."""
    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar_one()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    total_products = (await db.execute(select(func.count()).select_from(Product))).scalar_one()
    total_customers = (await db.execute(select(func.count()).select_from(Customer))).scalar_one()
    total_sales = (await db.execute(select(func.count()).select_from(Sale))).scalar_one()
    total_revenue = (await db.execute(select(func.coalesce(func.sum(Sale.total_amount), 0)))).scalar_one()

    return GlobalStats(
        total_tenants=total_tenants,
        total_users=total_users,
        total_products=total_products,
        total_customers=total_customers,
        total_sales=total_sales,
        total_revenue=float(total_revenue),
    )
