from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Los defaults asumen que el backend corre *dentro* de la red de
    Docker Compose (ver docker-compose.yml), donde Postgres/Redis/Kafka
    se resuelven por nombre de servicio (postgres, redis, kafka), no por
    localhost.

    Para desarrollo local en Mac (el backend corriendo directo en el
    host contra la infra levantada con `docker compose up -d`), estos
    valores se sobrescriben desde el `.env` de la raíz del proyecto —
    el mismo archivo que ya usa `docker compose` (ver README, `cp
    .env.example .env`), no uno nuevo por servicio. Ahí los hostnames
    son `localhost` con los puertos publicados al host.
    """

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    backend_env: str = "development"
    secret_key: str = "change-me"

    database_url: str = "postgresql://aurapro:aurapro@postgres:5432/aurapro"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"

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


settings = Settings()
