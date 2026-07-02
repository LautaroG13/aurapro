"""Mapeo ASYNC de la tabla `outbox` -- misma tabla física que usa el
código legacy (app/models/outbox.py, sync) y que lee
workers/crates/outbox-processor (Rust). No son dos tablas: son dos
vistas ORM independientes (una sync, una async) del mismo esquema en
Postgres.

No hereda TenantModel a propósito: `outbox` no es un dato de negocio
scoped a un tenant en el sentido de TenantModel (no tiene FK a
tenants.id) -- es infraestructura de mensajería compartida, y el tenant
va codificado *dentro* de `aggregate_id` (convención heredada del
diseño original del outbox, antes de que existiera Identity). Cualquier
módulo nuevo que necesite emitir un evento usa esto, agregándolo a la
MISMA sesión/transacción async que sus otras escrituras -- así el
evento y el dato de negocio se confirman juntos o ninguno lo hace.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.async_base import Base


class OutboxEvent(Base):
    __tablename__ = "outbox"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aggregate_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String, nullable=False, default="PENDING")
