"""Mixin base para toda tabla que pertenece a un tenant.

Cualquier modelo de negocio (Products, Sales, Finance, Customers, y
también Identity.User) hereda de esto además de `Base` (app/db/async_base.py).
Por sí solo, este mixin es "solo" una columna -- lo que lo convierte en
una frontera de seguridad real es que app/db/tenant_session.py filtra
automáticamente por `tenant_id` cualquier query que pase por una sesión
tenant-scoped, para *cualquier* clase que herede de TenantModel, sin que
cada módulo tenga que acordarse de escribir `.where(Model.tenant_id == ...)`
a mano.

El FK a `tenants.id` vive acá (vía `declared_attr`) para que sea
estructural -- ningún módulo nuevo puede "olvidarse" de apuntar al
tenant correcto, ya viene en el mixin.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class TenantModel:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @declared_attr
    def tenant_id(cls) -> Mapped[uuid.UUID]:
        return mapped_column(
            UUID(as_uuid=True),
            ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
