"""Registro de eventos VentaRealizada vía el patrón Transactional Outbox.

En vez de publicar a Kafka directo desde el flujo de request (lo que
puede dejar la venta persistida con el evento perdido si Kafka está
caído, o publicar un evento de una venta que después falla y se
revierte), la fila de outbox se inserta con la misma Session que
registra la venta, dentro de la misma transacción. Un worker separado
(workers/crates/outbox-processor) hace polling de esa tabla, publica en
Kafka y marca cada fila como PROCESSED — con reintentos automáticos si
Kafka no está disponible en el momento de la venta.
"""

import json

from sqlalchemy.orm import Session

from app.models.outbox import OutboxEvent
from app.schemas.sales_event import SalesEvent

SALES_EVENT_TOPIC = "aurapro.events.venta_realizada"
SALES_EVENT_TYPE = "VentaRealizada"


def build_sales_event(raw: dict) -> SalesEvent:
    """Valida un payload crudo (dict) contra el contrato VentaRealizada.

    Lanza pydantic.ValidationError si el payload no cumple el schema:
    tipos incorrectos, campos faltantes, campos extra no declarados, etc.
    """
    return SalesEvent.model_validate(raw)


def append_venta_realizada_to_outbox(db: Session, raw: dict) -> SalesEvent:
    """Valida el evento y agrega su fila de outbox a `db`, sin commitear.

    No abre ni cierra transacción: el caller controla eso. La idea es
    que el mismo `db.commit()` que persiste la venta persista también
    esta fila, así ambos escriben atómicamente o ninguno lo hace. Nunca
    se llama a Kafka acá.

    Ejemplo de uso, en el service que registra la venta:

        def registrar_venta(db: Session, sale_data: dict, event_data: dict) -> Venta:
            venta = Venta(**sale_data)
            db.add(venta)
            append_venta_realizada_to_outbox(db, event_data)
            db.commit()  # atómico: venta + evento outbox, o ninguno de los dos
            return venta
    """
    event = build_sales_event(raw)

    outbox_row = OutboxEvent(
        aggregate_id=event.tenant_id,
        event_type=SALES_EVENT_TYPE,
        payload=json.loads(event.model_dump_json()),
    )
    db.add(outbox_row)
    return event
