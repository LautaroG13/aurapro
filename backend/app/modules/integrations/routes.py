from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, require_role
from app.modules.identity.models import UserRole
from app.modules.integrations.models import IntegrationSetting
from app.modules.integrations.schemas import IntegrationConfigUpsert, IntegrationRead
from app.modules.integrations.services import (
    IntegrationNotFoundError,
    delete_integration,
    list_integrations,
    upsert_integration,
)

router = APIRouter()

ADMIN_ONLY = (UserRole.ADMIN.value,)


def _to_read(setting: IntegrationSetting) -> IntegrationRead:
    return IntegrationRead(
        provider=setting.provider,
        config_keys=sorted(setting.config.keys()),
        updated_at=setting.updated_at,
    )


@router.get("", response_model=list[IntegrationRead])
async def list_integrations_endpoint(
    _current_user: CurrentUser = Depends(require_role(*ADMIN_ONLY)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[IntegrationRead]:
    settings = await list_integrations(db)
    return [_to_read(s) for s in settings]


@router.put("/{provider}", response_model=IntegrationRead)
async def upsert_integration_endpoint(
    provider: str,
    payload: IntegrationConfigUpsert,
    current_user: CurrentUser = Depends(require_role(*ADMIN_ONLY)),
    db: AsyncSession = Depends(get_tenant_db),
) -> IntegrationRead:
    setting = await upsert_integration(db, current_user.tenant_id, provider, payload.config)
    return _to_read(setting)


@router.delete("/{provider}", status_code=204)
async def delete_integration_endpoint(
    provider: str,
    _current_user: CurrentUser = Depends(require_role(*ADMIN_ONLY)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_integration(db, provider)
    except IntegrationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
