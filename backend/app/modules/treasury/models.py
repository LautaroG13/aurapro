import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.shared.tenant_model import TenantModel


class AccountMovementType(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class AccountMovement(Base, TenantModel):
    """Movimiento de cuenta corriente de un cliente. El saldo no se
    guarda como columna -- se calcula sumando estos movimientos (ver
    get_customer_balance en services.py) para no arriesgar
    desincronización entre un valor cacheado y la suma real."""

    __tablename__ = "account_movements"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_account_movements_amount_positive"),)

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    type: Mapped[AccountMovementType] = mapped_column(
        Enum(AccountMovementType, name="account_movement_type", native_enum=False, length=10),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    # RESTRICT, no CASCADE: es historial transaccional, igual que
    # sale_items.product_id -- una venta que generó un movimiento no
    # se puede borrar.
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="RESTRICT"), nullable=True, index=True
    )


class CashSessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class CashSession(Base, TenantModel):
    """Una sola caja abierta por vez por tenant -- lo garantiza el
    índice único parcial de abajo (postgresql_where), no un chequeo a
    mano en el service que podría perderse en una carrera entre dos
    requests concurrentes."""

    __tablename__ = "cash_sessions"
    __table_args__ = (
        Index(
            "uq_cash_sessions_one_open_per_tenant",
            "tenant_id",
            unique=True,
            postgresql_where=text("status = 'OPEN'"),
        ),
    )

    opening_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    opened_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[CashSessionStatus] = mapped_column(
        Enum(CashSessionStatus, name="cash_session_status", native_enum=False, length=10),
        nullable=False,
        default=CashSessionStatus.OPEN,
        server_default=CashSessionStatus.OPEN.value,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Declarado: lo que se contó físicamente al cerrar. Esperado:
    # opening_amount + ingresos - egresos, calculado en el momento del
    # cierre (close_cash_session). La diferencia entre ambos es el
    # arqueo.
    closing_amount_declared: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    closing_amount_expected: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    movements: Mapped[list["CashMovement"]] = relationship(
        back_populates="cash_session", cascade="all, delete-orphan", order_by="CashMovement.created_at"
    )


class CashMovementType(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class CashMovement(Base, TenantModel):
    __tablename__ = "cash_movements"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_cash_movements_amount_positive"),)

    cash_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cash_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[CashMovementType] = mapped_column(
        Enum(CashMovementType, name="cash_movement_type", native_enum=False, length=10),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    # RESTRICT, mismo criterio que AccountMovement.sale_id.
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    cash_session: Mapped["CashSession"] = relationship(back_populates="movements")
