"""Health checks reales contra Postgres, Redis y Kafka, y el backlog de
la tabla outbox, para GET /api/v1/system/status y
GET /api/v1/system/outbox-stats.

Postgres no tiene un engine async en este proyecto — el resto del
backend usa SQLAlchemy sync (app/db/session.py) sobre psycopg2. En vez
de sumar un segundo stack de DB (async, con asyncpg) solo para este
chequeo, el SELECT 1 / COUNT corren en un thread aparte
(asyncio.to_thread) para que el endpoint siga siendo async de verdad
(no bloquea el event loop mientras espera a Postgres) sin duplicar la
configuración de conexión.
"""

import asyncio
import ssl

from aiokafka.admin import AIOKafkaAdminClient
from sqlalchemy import text

from app.cache.redis_client import redis_client
from app.core.config import settings
from app.db.session import engine
from app.schemas.system_status import ServiceStatus

KAFKA_ADMIN_TIMEOUT_MS = 5000


def _ping_postgres_sync() -> None:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


async def _check_postgres() -> ServiceStatus:
    try:
        await asyncio.to_thread(_ping_postgres_sync)
        return ServiceStatus(name="postgres", healthy=True)
    except Exception as exc:  # boundary con un sistema externo: cualquier fallo -> unhealthy
        return ServiceStatus(name="postgres", healthy=False, detail=str(exc))


async def _check_redis() -> ServiceStatus:
    try:
        await redis_client.ping()
        return ServiceStatus(name="redis", healthy=True)
    except Exception as exc:
        return ServiceStatus(name="redis", healthy=False, detail=str(exc))


async def _check_kafka() -> ServiceStatus:
    admin_client = AIOKafkaAdminClient(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        request_timeout_ms=KAFKA_ADMIN_TIMEOUT_MS,
        security_protocol="SASL_SSL",
        sasl_mechanism="PLAIN",
        sasl_plain_username=settings.kafka_user,
        sasl_plain_password=settings.kafka_password,
        ssl_context=ssl.create_default_context(),
    )
    try:
        await admin_client.start()
        await admin_client.list_topics()
        return ServiceStatus(name="kafka", healthy=True)
    except Exception as exc:
        return ServiceStatus(name="kafka", healthy=False, detail=str(exc))
    finally:
        await admin_client.close()


async def get_system_status() -> tuple[ServiceStatus, ServiceStatus, ServiceStatus]:
    """Los tres pings corren en paralelo: un servicio caído no debe
    sumar su latencia (o timeout) a la de los otros dos."""
    postgres_status, redis_status, kafka_status = await asyncio.gather(
        _check_postgres(), _check_redis(), _check_kafka()
    )
    return postgres_status, redis_status, kafka_status


def _count_pending_outbox_sync() -> int:
    with engine.connect() as conn:
        return conn.execute(
            text("SELECT COUNT(*) FROM outbox WHERE status = 'PENDING'")
        ).scalar_one()


async def count_pending_outbox() -> int:
    return await asyncio.to_thread(_count_pending_outbox_sync)
