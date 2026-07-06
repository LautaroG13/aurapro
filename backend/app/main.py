import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.cache.redis_client import check_redis_connection
from app.core.config import settings
from app.events.producer import get_producer, stop_producer
from app.middleware.tenancy import TenancyMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Redis y Kafka son servicios gestionados externos (Upstash /
    # Confluent Cloud) independientes entre sí -- cada uno va en su
    # propio try/except para que un fallo en uno no impida intentar el
    # otro, y para que la app llegue al yield (y sirva el resto de la
    # API) pase lo que pase acá.
    try:
        await check_redis_connection()
    except Exception:
        logger.exception("fallo inesperado chequeando Redis en el startup")

    try:
        await get_producer()
    except Exception:
        logger.exception("no se pudo arrancar el producer de Kafka en el startup")

    yield

    try:
        await stop_producer()
    except Exception:
        logger.exception("error cerrando el producer de Kafka en el shutdown")


app = FastAPI(title="AuraPro API", version="0.1.0", lifespan=lifespan)

# Orden importa: en Starlette, el middleware agregado último queda más
# "afuera". CORS va después de Tenancy para que CORSMiddleware pueda
# responder un preflight OPTIONS antes de que Tenancy llegue a mirar
# ningún header de auth.
app.add_middleware(TenancyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
