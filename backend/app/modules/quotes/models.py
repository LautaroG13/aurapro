"""Presupuestos: propuesta de venta para mandarle al cliente, sin
efecto en stock ni en tesorería (a diferencia de Sale, que sí descuenta
stock y puede generar movimientos de caja/cuenta corriente). Un
presupuesto aceptado se convierte en venta manualmente desde Ventas
-- no hay conversión automática Quote -> Sale todavía."""

import enum
import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.modules.customers.models import Customer
from app.modules.products.models import Product, ProductVariant
from app.shared.tenant_model import TenantModel


class QuoteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class Quote(Base, TenantModel):
    __tablename__ = "quotes"
    __table_args__ = (
        CheckConstraint("total_amount > 0", name="ck_quotes_total_amount_positive"),
        UniqueConstraint("tenant_id", "quote_number", name="uq_quotes_tenant_id_quote_number"),
    )

    # RESTRICT, mismo criterio que Sale.customer_id -- un cliente con
    # presupuestos no se puede borrar sin antes resolver esos
    # presupuestos (ver el catch de IntegrityError en customers/services.py).
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="ARS", server_default="ARS")
    # Correlativo por tenant, propio (no comparte contador con
    # Sale.sale_number) -- se asigna bajo lock sobre
    # Tenant.next_quote_number en la misma transacción de creación.
    quote_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus, name="quote_status", native_enum=False, length=20),
        nullable=False,
        default=QuoteStatus.PENDING,
        server_default=QuoteStatus.PENDING.value,
    )
    # Nullable: la validez es opcional, no todos los presupuestos la
    # necesitan. Fecha simple (no datetime), es "hasta tal día" no una
    # hora puntual.
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    customer: Mapped["Customer"] = relationship()
    items: Mapped[list["QuoteItem"]] = relationship(back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base, TenantModel):
    __tablename__ = "quote_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_quote_items_quantity_positive"),
        CheckConstraint("unit_price > 0", name="ck_quote_items_unit_price_positive"),
    )

    quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # RESTRICT, mismo criterio que SaleItem.product_id.
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Snapshot del precio cotizado -- ya resuelto (lista o mayorista
    # según el cliente) al momento de crear el presupuesto, igual que
    # SaleItem.unit_price.
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    quote: Mapped["Quote"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    variant: Mapped["ProductVariant | None"] = relationship()
