from collections.abc import AsyncIterator

from aiokafka import AIOKafkaConsumer, ConsumerRecord

from app.core.config import settings


async def consume(topic: str, group_id: str) -> AsyncIterator[ConsumerRecord]:
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=group_id,
    )
    await consumer.start()
    try:
        async for message in consumer:
            yield message
    finally:
        await consumer.stop()
