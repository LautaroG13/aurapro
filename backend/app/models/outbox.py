import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OutboxStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"


class OutboxEvent(Base):
    """Fila de la tabla `outbox` (ver infra/docker/postgres/init.sql).

    Se inserta con la misma Session/transacción que persiste el registro
    de negocio (ej. la venta) — ver app/services/sales_events.py. Un
    worker separado en Rust (workers/crates/outbox-processor) hace
    polling de las filas PENDING, las publica en Kafka y las marca
    PROCESSED.

    `status` es TEXT + CHECK en la DB (no un ENUM nativo de Postgres) para
    que agregar un status nuevo en el futuro sea un ALTER simple; por eso
    acá se mapea con `native_enum=False`.
    """

    __tablename__ = "outbox"
    __table_args__ = (
        # Índice parcial: solo indexa filas PENDING, que es exactamente
        # el filtro + orden que usa el polling de outbox-processor
        # (WHERE status = 'PENDING' ORDER BY created_at). Ver
        # infra/docker/postgres/init.sql, idx_outbox_pending -- este
        # modelo no lo tenía y por eso nunca se generó en Alembic.
        Index("idx_outbox_pending", "created_at", postgresql_where=text("status = 'PENDING'")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aggregate_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[OutboxStatus] = mapped_column(
        Enum(OutboxStatus, name="outbox_status", native_enum=False, length=20),
        default=OutboxStatus.PENDING,
        server_default=OutboxStatus.PENDING.value,
        nullable=False,
        index=True,
    )
