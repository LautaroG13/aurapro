from collections.abc import AsyncIterator
import ssl

from aiokafka import AIOKafkaConsumer, ConsumerRecord

from app.core.config import settings


async def consume(topic: str, group_id: str) -> AsyncIterator[ConsumerRecord]:
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=group_id,
        security_protocol="SASL_SSL",
        sasl_mechanism="PLAIN",
        sasl_plain_username=settings.kafka_user,
        sasl_plain_password=settings.kafka_password,
        ssl_context=ssl.create_default_context(),
    )
    await consumer.start()
    try:
        async for message in consumer:
            yield message
    finally:
        await consumer.stop()
