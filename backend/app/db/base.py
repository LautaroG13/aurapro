from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Importar modelos aquí para que Alembic los detecte al autogenerar migraciones.
from app.models import outbox  # noqa: F401
from app.models import purchase_orders  # noqa: F401
