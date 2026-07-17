import uuid

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.async_base import Base
from app.modules.identity.models import User
from app.shared.tenant_model import TenantModel


class CustomerType(Base, TenantModel):
    __tablename__ = "customer_types"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_customer_types_tenant_id_name"),)

    name: Mapped[str] = mapped_column(String, nullable=False)


class Customer(Base, TenantModel):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    credit_limit: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    # SET NULL, no CASCADE ni RESTRICT: si se borra el usuario vendedor,
    # el cliente no debe desaparecer ni bloquear el borrado del
    # usuario, solo perder la asignación.
    default_salesperson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # SET NULL: un tipo de cliente es una etiqueta de categorización
    # liviana, no un dato con historia transaccional -- borrar un tipo
    # no debe bloquearse por clientes que lo tengan asignado.
    customer_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_types.id", ondelete="SET NULL"), nullable=True, index=True
    )

    default_salesperson: Mapped["User | None"] = relationship()
    customer_type: Mapped["CustomerType | None"] = relationship()
