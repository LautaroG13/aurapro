from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.integrations.models import IntegrationSetting


class IntegrationNotFoundError(Exception):
    pass


async def list_integrations(db: AsyncSession) -> list[IntegrationSetting]:
    result = await db.execute(select(IntegrationSetting).order_by(IntegrationSetting.provider))
    return list(result.scalars().all())


async def _get_by_provider(db: AsyncSession, provider: str) -> IntegrationSetting | None:
    result = await db.execute(select(IntegrationSetting).where(IntegrationSetting.provider == provider))
    return result.scalar_one_or_none()


async def upsert_integration(
    db: AsyncSession, tenant_id: UUID, provider: str, config: dict[str, str]
) -> IntegrationSetting:
    existing = await _get_by_provider(db, provider)
    if existing is not None:
        existing.config = config
        await db.commit()
        await db.refresh(existing)
        return existing

    setting = IntegrationSetting(tenant_id=tenant_id, provider=provider, config=config)
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting


async def delete_integration(db: AsyncSession, provider: str) -> None:
    existing = await _get_by_provider(db, provider)
    if existing is None:
        raise IntegrationNotFoundError(f"No hay configuración guardada para '{provider}'")
    await db.delete(existing)
    await db.commit()
