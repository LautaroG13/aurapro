"""Notas de pedido: compromiso de venta con el cliente, todavía no
facturado. A diferencia de Quote (propuesta que puede no concretarse
nunca), una nota de pedido existe para eventualmente "levantarse" en
una Sale real desde Ventas -- ver SaleCreate.order_note_id y el hook
en sales/services.py::create_sale. Igual que Quote, NO toca stock ni
tesorería por sí sola; el efecto real ocurre recién cuando se factura."""

import enum
import uuid

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.modules.customers.models import Customer
from app.modules.products.models import Product, ProductVariant
from app.shared.tenant_model import TenantModel


class OrderNoteStatus(str, enum.Enum):
    PENDING = "PENDING"
    INVOICED = "INVOICED"
    CANCELLED = "CANCELLED"


class OrderNote(Base, TenantModel):
    __tablename__ = "order_notes"
    __table_args__ = (
        CheckConstraint("total_amount > 0", name="ck_order_notes_total_amount_positive"),
        UniqueConstraint("tenant_id", "order_note_number", name="uq_order_notes_tenant_id_order_note_number"),
    )

    # RESTRICT, mismo criterio que Sale.customer_id / Quote.customer_id.
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="ARS", server_default="ARS")
    # Correlativo propio por tenant -- contador separado de
    # Sale.sale_number y Quote.quote_number (Tenant.next_order_note_number).
    order_note_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[OrderNoteStatus] = mapped_column(
        Enum(OrderNoteStatus, name="order_note_status", native_enum=False, length=20),
        nullable=False,
        default=OrderNoteStatus.PENDING,
        server_default=OrderNoteStatus.PENDING.value,
    )
    # SET NULL, no RESTRICT: Sale no tiene endpoint de borrado hoy así
    # que en la práctica nunca se dispara, pero si algún día lo
    # tuviera, borrar la venta no debería bloquearse por la nota que la
    # originó -- la nota simplemente queda "huérfana" del link.
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="SET NULL"), nullable=True, index=True
    )

    customer: Mapped["Customer"] = relationship()
    items: Mapped[list["OrderNoteItem"]] = relationship(back_populates="order_note", cascade="all, delete-orphan")


class OrderNoteItem(Base, TenantModel):
    __tablename__ = "order_note_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_note_items_quantity_positive"),
        CheckConstraint("unit_price > 0", name="ck_order_note_items_unit_price_positive"),
    )

    order_note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("order_notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order_note: Mapped["OrderNote"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    variant: Mapped["ProductVariant | None"] = relationship()
