"""Escritura y lectura de la velocidad de venta en ventana móvil.

Diseño: un HASH por (tenant_id, product_id) con un field por bucket de 1
minuto (`HINCRBYFLOAT sales:velocity:{tenant}:{product} <bucket> <qty>`).
Escribir es O(1). Leer "los últimos 15 minutos" es un único `HMGET` de
15 fields — un round-trip, O(15), sub-milisegundo sin importar cuántos
eventos de venta hubo en la ventana (a diferencia de guardar un
miembro por evento en un ZSET, donde leer la velocidad implicaría sumar
N eventos client-side).

El HASH completo tiene TTL (se refresca en cada escritura), así que un
producto sin ventas recientes libera su memoria solo, sin cron de limpieza.
"""

from datetime import datetime, timezone

from redis.asyncio import Redis

from app.metrics.redis_keys import (
    DAILY_RETENTION_SECONDS,
    VELOCITY_BUCKET_SECONDS,
    VELOCITY_TTL_SECONDS,
    VELOCITY_WINDOW_SECONDS,
    daily_hash_key,
    minute_bucket,
    velocity_hash_key,
)

BUCKETS_PER_WINDOW = VELOCITY_WINDOW_SECONDS // VELOCITY_BUCKET_SECONDS


async def record_sale(
    redis: Redis,
    tenant_id: str,
    product_id: str,
    quantity: float,
    event_ts: datetime,
) -> None:
    """Suma `quantity` al bucket de minuto de `event_ts` (ventana móvil)
    y al bucket de día (historial para el forecast). Una sola llamada
    por línea de producto de un evento VentaRealizada."""
    bucket = minute_bucket(event_ts.timestamp())
    day_field = event_ts.strftime("%Y-%m-%d")

    velocity_key = velocity_hash_key(tenant_id, product_id)
    daily_key = daily_hash_key(tenant_id, product_id)

    pipe = redis.pipeline(transaction=False)
    pipe.hincrbyfloat(velocity_key, bucket, quantity)
    pipe.expire(velocity_key, VELOCITY_TTL_SECONDS)
    pipe.hincrbyfloat(daily_key, day_field, quantity)
    pipe.expire(daily_key, DAILY_RETENTION_SECONDS)
    await pipe.execute()


async def sales_velocity(
    redis: Redis,
    tenant_id: str,
    product_id: str,
    now: datetime | None = None,
) -> float:
    """Unidades vendidas en los últimos VELOCITY_WINDOW_SECONDS (15 min).

    Un único HMGET de BUCKETS_PER_WINDOW (15) fields — sub-milisegundo.
    """
    now = now or datetime.now(timezone.utc)
    current_bucket = int(now.timestamp() // VELOCITY_BUCKET_SECONDS)
    fields = [str(current_bucket - i) for i in range(BUCKETS_PER_WINDOW)]

    key = velocity_hash_key(tenant_id, product_id)
    values = await redis.hmget(key, fields)
    return sum(float(v) for v in values if v is not None)
