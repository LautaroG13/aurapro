from aiokafka import AIOKafkaProducer

from app.core.config import settings

_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
        await _producer.start()
    return _producer


async def publish(topic: str, value: bytes, key: bytes | None = None) -> None:
    producer = await get_producer()
    await producer.send_and_wait(topic, value=value, key=key)
