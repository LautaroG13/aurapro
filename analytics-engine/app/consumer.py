"""Consumer de aurapro.events.venta_realizada: valida cada evento contra
el contrato y actualiza las métricas en Redis (rolling_window.py).

Commitea el offset recién después de escribir en Redis (no antes), y
antes de procesar marca el event_id como visto con `SET ... NX`. El
outbox garantiza *at-least-once*: si este proceso muere entre escribir
en Redis y commitear el offset, Kafka va a reentregar el mensaje al
reiniciar. Sin el guard de dedup esa redelivery duplicaría el conteo de
ventas; con él, el segundo intento se descarta sin tocar las métricas.
"""

import json
import logging

from aiokafka import AIOKafkaConsumer
from pydantic import ValidationError
from redis.asyncio import Redis

from app.core.config import settings
from app.metrics.redis_keys import DEDUP_TTL_SECONDS, dedup_key
from app.metrics.rolling_window import record_sale
from app.schemas.sales_event import SalesEvent

logger = logging.getLogger(__name__)

TOPIC = "aurapro.events.venta_realizada"
GROUP_ID = "analytics-engine"


async def handle_message(redis: Redis, raw_value: bytes) -> None:
    try:
        payload = json.loads(raw_value)
        event = SalesEvent.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.error("evento inválido, se descarta: %s", exc)
        return

    is_new = await redis.set(dedup_key(str(event.event_id)), "1", nx=True, ex=DEDUP_TTL_SECONDS)
    if not is_new:
        logger.debug("evento %s ya procesado, se ignora (redelivery)", event.event_id)
        return

    for item in event.product_details:
        await record_sale(
            redis,
            tenant_id=event.tenant_id,
            product_id=item.product_id,
            quantity=item.quantity,
            event_ts=event.timestamp,
        )

    logger.info(
        "evento %s procesado: tenant=%s líneas=%d",
        event.event_id,
        event.tenant_id,
        len(event.product_details),
    )


async def run() -> None:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    consumer = AIOKafkaConsumer(
        TOPIC,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=GROUP_ID,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
        security_protocol="SASL_SSL",
        sasl_mechanism="PLAIN",
        sasl_plain_username=settings.kafka_user,
        sasl_plain_password=settings.kafka_password,
    )
    await consumer.start()
    logger.info("analytics-engine escuchando %s (group=%s)", TOPIC, GROUP_ID)

    try:
        async for message in consumer:
            await handle_message(redis, message.value)
            await consumer.commit()
    finally:
        await consumer.stop()
        await redis.aclose()
