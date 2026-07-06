import logging
import sys

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Infra cloud-native (Upstash + Confluent Cloud), no Docker Compose
    ni desarrollo local. Sin default a propósito: sin estas vars
    seteadas en el entorno real, el proceso debe fallar rápido en vez de
    intentar resolver `localhost`, que no existe fuera de dev local.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    kafka_bootstrap_servers: str
    kafka_user: str
    kafka_password: str
    redis_url: str


try:
    settings = Settings()
except ValidationError as exc:
    missing = [".".join(str(part) for part in error["loc"]) for error in exc.errors() if error["type"] == "missing"]
    if missing:
        logger.critical(
            "faltan variables de entorno obligatorias: %s -- seteá REDIS_URL "
            "(Upstash, rediss://), KAFKA_BOOTSTRAP_SERVERS, KAFKA_USER y "
            "KAFKA_PASSWORD (Confluent Cloud) antes de arrancar analytics-engine",
            ", ".join(missing),
        )
    else:
        logger.critical("error de configuración: %s", exc)
    sys.exit(1)
