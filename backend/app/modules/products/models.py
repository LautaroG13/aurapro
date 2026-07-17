import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.shared.tenant_model import TenantModel


class Product(Base, TenantModel):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_products_price_positive"),
        CheckConstraint("cost > 0", name="ck_products_cost_positive"),
        CheckConstraint("current_stock >= 0", name="ck_products_current_stock_non_negative"),
        # NULL no choca consigo mismo en Postgres -- productos sin sku
        # (todos los existentes, hoy) no violan este constraint entre sí.
        UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_id_sku"),
    )

    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    # Nullable a propósito: productos ya existentes no tienen costo
    # cargado. La utilidad/margen NO se guarda acá -- se calcula en el
    # frontend como price - cost, así no hay que mantenerlo
    # sincronizado en la base.
    cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    current_stock: Mapped[int] = mapped_column(nullable=False, default=0)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    sku: Mapped[str | None] = mapped_column(String, nullable=True)
    barcode: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)

    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class ProductVariant(Base, TenantModel):
    """current_stock de Product sigue siendo la fuente de verdad para
    productos SIN variantes. Para productos CON variantes, el stock
    "real" es la suma de stock acá -- esa lógica vive en el frontend
    (ver plan), no hay trigger ni columna calculada en la base.

    attributes es JSONB de pares clave-valor libres (ej. {"color":
    "rojo", "talle": "M"} para indumentaria, {"capacidad": "128GB"}
    para electrónica) en vez de columnas fijas -- el proyecto se vende
    a negocios de cualquier rubro, no solo indumentaria."""

    __tablename__ = "product_variants"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="ck_product_variants_stock_non_negative"),
        # Mismo patrón que Product.sku: NULL no choca consigo mismo en
        # Postgres, así que variantes sin sku no violan este constraint.
        UniqueConstraint("tenant_id", "sku", name="uq_product_variants_tenant_id_sku"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    sku: Mapped[str | None] = mapped_column(String, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    product: Mapped["Product"] = relationship(back_populates="variants")
