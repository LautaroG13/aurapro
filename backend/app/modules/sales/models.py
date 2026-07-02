import enum
import uuid

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.modules.customers.models import Customer
from app.modules.products.models import Product
from app.shared.tenant_model import TenantModel


class SaleStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Sale(Base, TenantModel):
    __tablename__ = "sales"
    __table_args__ = (CheckConstraint("total_amount > 0", name="ck_sales_total_amount_positive"),)

    # RESTRICT, no CASCADE: un Customer con ventas asociadas no se puede
    # borrar (ver el fix en customers/services.py que atrapa el
    # IntegrityError resultante y lo convierte en un 409 claro).
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus, name="sale_status", native_enum=False, length=20),
        nullable=False,
        default=SaleStatus.COMPLETED,
    )
    payment_method: Mapped[str] = mapped_column(String, nullable=False)

    customer: Mapped["Customer"] = relationship()
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base, TenantModel):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_items_quantity_positive"),
        CheckConstraint("unit_price > 0", name="ck_sale_items_unit_price_positive"),
    )

    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # RESTRICT: un Product vendido alguna vez no se puede borrar (ver el
    # fix análogo en products/services.py).
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Snapshot del precio al momento de la venta -- Product.price puede
    # cambiar después; el historial de ventas no debe reescribirse solo
    # porque el precio de catálogo cambió.
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
