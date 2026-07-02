"""Sesión async (asyncpg) para los módulos nuevos. Coexiste con
app/db/session.py (sync, psycopg2) que sigue usando el código legacy."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

async_engine = create_async_engine(settings.async_database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Sesión SIN scoping por tenant. Solo para lo que legítimamente no
    tiene un tenant_id disponible todavía -- registro (crea el tenant) y
    login (busca al usuario por email antes de saber de qué tenant es).
    Para cualquier dato de negocio, usar get_tenant_db
    (app/db/tenant_session.py), no esto."""
    async with AsyncSessionLocal() as session:
        yield session
