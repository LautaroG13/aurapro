"""Simula N ventas para ver reaccionar el resto del sistema en vivo.

Todavía no existe un endpoint HTTP para crear una venta (no hay
`POST /api/v1/sales`), así que este script inserta el evento
VentaRealizada directo en la tabla `outbox` vía
app/services/sales_events.py::append_venta_realizada_to_outbox — el
mismo camino que seguiría ese endpoint el día que exista. No reemplaza
un endpoint real; es un atajo de terminal para generar tráfico de
prueba y ver el pipeline moverse.

Uso:
    cd backend
    python -m scripts.test_flow --count 3
    python -m scripts.test_flow --tenant-id tenant-1 --product-id sku-1 --count 5

Qué mirar en localhost:3000 (componente SystemMonitor, poll cada 10s):
- El contador de "Backlog de outbox" debería subir en --count apenas
  corre este script.
- Si `outbox-processor` (Rust) está corriendo, ese número vuelve a
  bajar solo en los siguientes segundos, a medida que drena la tabla.
  Para *ver* la subida de forma confiable, corré este script con
  outbox-processor parado, mirá el número subir en el dashboard,
  después arrancalo (`cd workers && cargo run -p outbox-processor`) y
  mirá cómo baja.
"""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from uuid import uuid4

from app.db.session import SessionLocal
from app.services.sales_events import append_venta_realizada_to_outbox

DEFAULT_BACKEND_URL = "http://localhost:8000"


def build_fake_sale(tenant_id: str, product_id: str) -> dict:
    """Payload mínimo válido contra shared/schemas/sales_event.json."""
    return {
        "event_id": str(uuid4()),
        "event_type": "VentaRealizada",
        "schema_version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
        "product_details": [
            {
                "product_id": product_id,
                "name": "Producto de prueba (test_flow.py)",
                "quantity": 1,
                "unit_price": 9.99,
            }
        ],
        "transaction_amount": {"amount": 9.99, "currency": "USD"},
    }


def get_pending_outbox_count(backend_url: str) -> int | None:
    """GET /api/v1/system/outbox-stats. None si el backend no responde
    (no hace falta que esté corriendo para que el script funcione, solo
    para el resumen antes/después)."""
    try:
        with urllib.request.urlopen(f"{backend_url}/api/v1/system/outbox-stats", timeout=3) as resp:
            return json.loads(resp.read())["pending_count"]
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tenant-id", default="tenant-1")
    parser.add_argument("--product-id", default="sku-1")
    parser.add_argument("--count", type=int, default=1, help="cuántas ventas simular")
    parser.add_argument("--backend-url", default=DEFAULT_BACKEND_URL)
    args = parser.parse_args()

    before = get_pending_outbox_count(args.backend_url)
    if before is None:
        print(f"(no se pudo leer {args.backend_url}/api/v1/system/outbox-stats — ¿está el backend corriendo?)")
    else:
        print(f"outbox PENDING antes: {before}")

    db = SessionLocal()
    try:
        for i in range(args.count):
            raw = build_fake_sale(args.tenant_id, args.product_id)
            event = append_venta_realizada_to_outbox(db, raw)
            db.commit()
            print(f"[{i + 1}/{args.count}] evento {event.event_id} agregado a outbox (PENDING)")
    finally:
        db.close()

    after = get_pending_outbox_count(args.backend_url)
    if after is not None:
        print(f"outbox PENDING después: {after}")
        if before is not None:
            print(f"delta: {after - before:+d} (esperado +{args.count} si outbox-processor no está drenando en paralelo)")

    print("\nMirá http://localhost:3000 — el contador de Backlog de outbox debería reflejar esto en el próximo poll (<=10s).")


if __name__ == "__main__":
    main()
