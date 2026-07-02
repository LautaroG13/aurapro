"""Convenciones de claves de Redis para analytics-engine.

`sales:velocity:*` y `sales:daily:*` son HASH con bucketing temporal (un
field por minuto / por día) en vez de una clave por evento o por minuto.
Eso hace que leer "ventas de los últimos N minutos" sea un HMGET de N
fields — O(N buckets), no O(eventos) ni O(claves en el keyspace). Ver el
docstring de rolling_window.py para el razonamiento completo.
"""

VELOCITY_BUCKET_SECONDS = 60
VELOCITY_WINDOW_SECONDS = 15 * 60
# Margen sobre la ventana para que el TTL del HASH no lo mate mientras
# todavía hay buckets dentro de la ventana que alguien podría leer.
VELOCITY_TTL_SECONDS = VELOCITY_WINDOW_SECONDS + VELOCITY_BUCKET_SECONDS * 5

# Historial diario para el forecast de stockout (scripts/forecast_stockout.py).
DAILY_RETENTION_SECONDS = 180 * 24 * 3600

DEDUP_TTL_SECONDS = 24 * 3600


def velocity_hash_key(tenant_id: str, product_id: str) -> str:
    return f"sales:velocity:{tenant_id}:{product_id}"


def daily_hash_key(tenant_id: str, product_id: str) -> str:
    return f"sales:daily:{tenant_id}:{product_id}"


def dedup_key(event_id: str) -> str:
    return f"sales:processed:{event_id}"


def stock_key(tenant_id: str, product_id: str) -> str:
    """Convención asumida: este proyecto todavía no tiene un servicio de
    inventario propio. Sembrar esta clave manualmente (o desde el
    servicio que corresponda) para poder correr el forecast."""
    return f"inventory:stock:{tenant_id}:{product_id}"


def forecast_key(tenant_id: str, product_id: str) -> str:
    return f"inventory:forecast:{tenant_id}:{product_id}"


def minute_bucket(ts_epoch_seconds: float) -> str:
    return str(int(ts_epoch_seconds // VELOCITY_BUCKET_SECONDS))
