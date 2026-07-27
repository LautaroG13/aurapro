"""Configuración de integraciones externas (pasarelas de pago, etc.)
por tenant. Cada empresa que usa AuraPro va a tener sus propias
credenciales (token de Mercado Pago, claves de ARCA/AFIP, u otro
proveedor futuro) -- no hay una integración real conectada todavía,
esto es solo el lugar donde guardarlas para cuando se conecte.

`config` es JSONB de pares clave-valor libres (mismo criterio que
ProductVariant.attributes) porque cada proveedor tiene su propio set de
campos (access_token/public_key para Mercado Pago, cuit/cert para
ARCA, etc.) -- no tiene sentido una columna fija por campo.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.async_base import Base
from app.shared.tenant_model import TenantModel


class IntegrationSetting(Base, TenantModel):
    __tablename__ = "integration_settings"
    __table_args__ = (UniqueConstraint("tenant_id", "provider", name="uq_integration_settings_tenant_provider"),)

    provider: Mapped[str] = mapped_column(String, nullable=False)
    config: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    # created_at (heredado de TenantModel) queda fijo en el primer save;
    # esto sí se pisa en cada upsert -- útil para mostrar "última
    # actualización" en la UI sin exponer los valores del config.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
