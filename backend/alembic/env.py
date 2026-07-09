from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base as LegacyBase
from app.db.async_base import Base as AsyncBase

# Importar los módulos de modelos "nuevos" (app/modules/*) para que se
# registren en AsyncBase.metadata -- sin importarlos, esa metadata
# queda vacía y autogenerate no ve tenants/users/products/customers/
# sales. app/db/base.py ya hace lo mismo por los suyos (ver el bottom
# de ese archivo, importa outbox y purchase_orders).
#
# A propósito NO se importa app.shared.outbox_model acá: esa es una
# segunda mapeación (async) de la misma tabla física `outbox` que ya
# cubre LegacyBase vía app/models/outbox.py, con una definición de
# `status` distinta (sin el CHECK constraint ni el index de la versión
# sync). Si se importa, AsyncBase.metadata registra su propia tabla
# "outbox" y Alembic tira `ValueError: Duplicate table keys across
# multiple MetaData objects` apenas arranca autogenerate -- no llega
# siquiera a un hook tipo include_object. No importarlo acá es
# suficiente: la tabla física sigue siendo una sola, LegacyBase queda
# como única fuente de verdad para Alembic.
from app.modules.identity import models as identity_models  # noqa: F401
from app.modules.products import models as products_models  # noqa: F401
from app.modules.customers import models as customers_models  # noqa: F401
from app.modules.sales import models as sales_models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)

# Dos Base declarativos distintos conviven en este proyecto (ver el
# docstring de app/db/async_base.py): el legacy (outbox, purchase_orders)
# y el de los módulos nuevos. Alembic necesita ver ambos para detectar
# todo el esquema, no solo la mitad legacy.
target_metadata = [LegacyBase.metadata, AsyncBase.metadata]


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
