"""Consola global. Cada ruta acá lleva Depends(require_superadmin) --
403 para cualquier usuario autenticado sin is_superadmin=True, sin
importar su `role` de tenant (ADMIN incluido). Ver
identity/dependencies.py::require_superadmin."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.admin.schemas import GlobalStats, TenantCreateAdmin, TenantSummary
from app.modules.admin.services import (
    TenantNotFoundError,
    create_tenant_as_admin,
    get_global_stats,
    list_all_tenants,
    set_tenant_active,
)
from app.modules.identity.dependencies import CurrentUser, require_superadmin
from app.modules.identity.services import EmailAlreadyRegisteredError

router = APIRouter()


@router.get("/tenants", response_model=list[TenantSummary])
async def list_tenants_endpoint(
    _current_user: CurrentUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[TenantSummary]:
    return await list_all_tenants(db)


@router.post("/tenants", response_model=TenantSummary, status_code=201)
async def create_tenant_endpoint(
    payload: TenantCreateAdmin,
    _current_user: CurrentUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_tenant_db),
) -> TenantSummary:
    try:
        return await create_tenant_as_admin(db, payload.tenant_name, payload.admin_email, payload.admin_password)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/stats", response_model=GlobalStats)
async def global_stats_endpoint(
    _current_user: CurrentUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_tenant_db),
) -> GlobalStats:
    return await get_global_stats(db)


@router.post("/tenants/{tenant_id}/suspend", response_model=TenantSummary)
async def suspend_tenant_endpoint(
    tenant_id: UUID,
    _current_user: CurrentUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_tenant_db),
) -> TenantSummary:
    try:
        return await set_tenant_active(db, tenant_id, is_active=False)
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/tenants/{tenant_id}/activate", response_model=TenantSummary)
async def activate_tenant_endpoint(
    tenant_id: UUID,
    _current_user: CurrentUser = Depends(require_superadmin),
    db: AsyncSession = Depends(get_tenant_db),
) -> TenantSummary:
    try:
        return await set_tenant_active(db, tenant_id, is_active=True)
    except TenantNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
