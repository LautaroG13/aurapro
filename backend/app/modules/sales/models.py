import enum
import uuid

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.modules.customers.models import Customer
from app.modules.products.models import Product, ProductVariant
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
    # server_default además de default: sin esto, un INSERT que llegue
    # por fuera del ORM (no vía la Session de SQLAlchemy) rompe con
    # NOT NULL violation en vez de heredar 'USD'/'COMPLETED' como hacía
    # init.sql a nivel de Postgres.
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD", server_default="USD")
    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus, name="sale_status", native_enum=False, length=20),
        nullable=False,
        default=SaleStatus.COMPLETED,
        server_default=SaleStatus.COMPLETED.value,
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
    # Nullable: solo se completa cuando el producto vendido tiene
    # variantes. RESTRICT, mismo criterio que product_id -- una variante
    # vendida alguna vez no se puede borrar, es historial transaccional.
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Snapshot del precio al momento de la venta -- Product.price puede
    # cambiar después; el historial de ventas no debe reescribirse solo
    # porque el precio de catálogo cambió.
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    variant: Mapped["ProductVariant | None"] = relationship()
