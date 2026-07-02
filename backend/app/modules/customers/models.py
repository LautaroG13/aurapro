from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.async_base import Base
from app.shared.tenant_model import TenantModel


class Customer(Base, TenantModel):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
