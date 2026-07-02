from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarativa para los módulos nuevos (app/modules/*), separada
    de app/db/base.py (sync, usado por el código legacy: outbox,
    purchase_orders). Es un estado transicional deliberado, no el diseño
    final -- ver la nota en el README sobre el plan de migración."""

    pass
