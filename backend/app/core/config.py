import logging
import sys

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Infra cloud-native (Render + Upstash + Confluent Cloud), no
    Docker Compose. redis_url, kafka_bootstrap_servers, kafka_user y
    kafka_password no tienen default: sin ellas seteadas en el entorno
    real, la app debe fallar rápido en vez de intentar resolver
    `redis`/`kafka` por nombre de servicio, que no existen fuera de la
    red de Docker Compose usada en desarrollo local.
    """

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    backend_env: str = "development"
    secret_key: str = "change-me"

    database_url: str = "postgresql://aurapro:aurapro@postgres:5432/aurapro"

    # Upstash Redis (rediss://, TLS incluido) y Confluent Cloud Kafka
    # (SASL_SSL). Sin default a propósito -- ver docstring de la clase.
    redis_url: str
    kafka_bootstrap_servers: str
    kafka_user: str
    kafka_password: str

    # Orígenes permitidos por CORS. El frontend (Next.js, puerto 3000) y
    # el backend (puerto 8000) son orígenes distintos aunque compartan
    # host, así que sin esto el navegador bloquea toda respuesta. Lista
    # separada por comas vía env var CORS_ORIGINS si hace falta agregar
    # un dominio de deploy más adelante.
    cors_origins: list[str] = ["http://localhost:3000"]

    # JWT (Identity). HS256 con secret_key alcanza para este esqueleto;
    # para un despliegue real, secret_key tiene que dejar de ser
    # "change-me" (ver README).
    access_token_expire_minutes: int = 60

    @property
    def async_database_url(self) -> str:
        """database_url usa el driver sync (psycopg2, postgresql://) para
        el código legacy. Los módulos nuevos usan asyncpg
        (postgresql+asyncpg://) -- se deriva de la misma URL en vez de
        mantener dos settings separados que podrían desincronizarse."""
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


try:
    settings = Settings()
except ValidationError as exc:
    missing = [".".join(str(part) for part in error["loc"]) for error in exc.errors() if error["type"] == "missing"]
    if missing:
        logger.critical(
            "faltan variables de entorno obligatorias: %s -- seteá REDIS_URL "
            "(Upstash, rediss://), KAFKA_BOOTSTRAP_SERVERS, KAFKA_USER y "
            "KAFKA_PASSWORD (Confluent Cloud) antes de arrancar el backend",
            ", ".join(missing),
        )
    else:
        logger.critical("error de configuración: %s", exc)
    sys.exit(1)
