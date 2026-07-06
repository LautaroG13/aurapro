import logging

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Timeouts cortos a propósito: si Upstash tarda o no responde, el
# arranque del backend no debe colgarse esperando -- mejor fallar rápido
# en el ping (ver check_redis_connection) y dejar que el resto de la API
# siga sirviendo.
redis_client = Redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
)


async def check_redis_connection() -> bool:
    """Ping no bloqueante para el startup: loguea éxito/error y devuelve
    un bool en vez de propagar la excepción, para que un Upstash caído no
    tumbe el proceso completo (ver lifespan en main.py)."""
    try:
        await redis_client.ping()
        logger.info("conexión a Redis (Upstash) OK")
        return True
    except Exception as exc:
        logger.error("no se pudo conectar a Redis: %s", exc)
        return False
