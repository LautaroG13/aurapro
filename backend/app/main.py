from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.middleware.tenancy import TenancyMiddleware

app = FastAPI(title="AuraPro API", version="0.1.0")

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
