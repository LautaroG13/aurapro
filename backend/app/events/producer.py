import logging

from aiokafka import AIOKafkaProducer

from app.core.config import settings

logger = logging.getLogger(__name__)

_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            security_protocol="SASL_SSL",
            sasl_mechanism="PLAIN",
            sasl_plain_username=settings.kafka_user,
            sasl_plain_password=settings.kafka_password,
        )
        try:
            await producer.start()
        except Exception:
            logger.exception("no se pudo conectar el producer de Kafka (Confluent Cloud)")
            raise
        # Recién acá queda cacheado -- si start() falla, _producer sigue
        # en None y la próxima llamada reintenta en vez de devolver para
        # siempre un producer que nunca arrancó.
        _producer = producer
    return _producer


async def publish(topic: str, value: bytes, key: bytes | None = None) -> None:
    producer = await get_producer()
    await producer.send_and_wait(topic, value=value, key=key)


async def stop_producer() -> None:
    """Cierra la conexión al broker en el shutdown del backend -- sin
    esto, cada reinicio/redeploy en Render deja la conexión SASL_SSL
    colgada del lado de Confluent Cloud hasta que expire por timeout."""
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
