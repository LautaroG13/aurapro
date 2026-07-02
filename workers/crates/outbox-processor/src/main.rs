//! Worker de outbox: hace polling de `outbox` (ver
//! infra/docker/postgres/init.sql), publica cada fila PENDING en su
//! topic de Kafka y la marca PROCESSED.
//!
//! Se eligió polling por sobre LISTEN/NOTIFY porque NOTIFY no persiste
//! notificaciones perdidas mientras nadie escucha (ej. el worker
//! reiniciando) — el poll loop se auto-recupera solo de eso sin lógica
//! extra. NOTIFY podría sumarse después como optimización de latencia
//! (despertar el loop antes de que venza el intervalo), pero el polling
//! tiene que seguir siendo la fuente de verdad para no perder eventos.

use std::time::Duration;

use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;
use sqlx::postgres::PgPool;
use sqlx::Row;
use uuid::Uuid;
use worker_core::config::Config;
use worker_core::db::build_pool;
use worker_core::kafka::build_producer;

const POLL_INTERVAL: Duration = Duration::from_millis(500);
const BATCH_SIZE: i64 = 100;
const KAFKA_SEND_TIMEOUT: Duration = Duration::from_secs(5);

struct OutboxRow {
    id: Uuid,
    aggregate_id: String,
    event_type: String,
    payload: serde_json::Value,
}

/// Mapeo event_type -> topic de Kafka. Extensible: agregar un nuevo tipo
/// de evento al outbox es un nuevo `match arm` acá.
fn topic_for_event_type(event_type: &str) -> Option<&'static str> {
    match event_type {
        "VentaRealizada" => Some("aurapro.events.venta_realizada"),
        "OrdenCompraGenerada" => Some("aurapro.events.orden_compra_generada"),
        _ => None,
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;
    let pool = build_pool(&config.database_url).await?;
    let producer = build_producer(&config.kafka_bootstrap_servers)?;

    tracing::info!("outbox-processor iniciado, polling cada {POLL_INTERVAL:?}");

    let mut ticker = tokio::time::interval(POLL_INTERVAL);
    loop {
        ticker.tick().await;
        if let Err(err) = process_batch(&pool, &producer).await {
            tracing::error!("error procesando batch de outbox: {err:#}");
        }
    }
}

async fn process_batch(pool: &PgPool, producer: &FutureProducer) -> anyhow::Result<()> {
    let mut tx = pool.begin().await?;

    // FOR UPDATE SKIP LOCKED: si corren varias réplicas de este worker,
    // cada una toma un batch de filas distinto en vez de pelear por las
    // mismas o bloquearse entre sí.
    let rows = sqlx::query(
        r#"
        SELECT id, aggregate_id, event_type, payload
        FROM outbox
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        "#,
    )
    .bind(BATCH_SIZE)
    .fetch_all(&mut *tx)
    .await?;

    if rows.is_empty() {
        tx.commit().await?;
        return Ok(());
    }

    tracing::debug!("procesando {} eventos pendientes", rows.len());

    for row in rows {
        let outbox_row = OutboxRow {
            id: row.try_get("id")?,
            aggregate_id: row.try_get("aggregate_id")?,
            event_type: row.try_get("event_type")?,
            payload: row.try_get("payload")?,
        };

        let Some(topic) = topic_for_event_type(&outbox_row.event_type) else {
            tracing::error!(
                event_id = %outbox_row.id,
                event_type = %outbox_row.event_type,
                "tipo de evento sin topic mapeado, se deja PENDING para revisión manual"
            );
            continue;
        };

        let payload_bytes = serde_json::to_vec(&outbox_row.payload)?;

        let record = FutureRecord::to(topic)
            .key(&outbox_row.aggregate_id)
            .payload(&payload_bytes);

        match producer.send(record, Timeout::After(KAFKA_SEND_TIMEOUT)).await {
            Ok(_) => {
                sqlx::query("UPDATE outbox SET status = 'PROCESSED' WHERE id = $1")
                    .bind(outbox_row.id)
                    .execute(&mut *tx)
                    .await?;
                tracing::info!(event_id = %outbox_row.id, topic, "evento publicado y marcado PROCESSED");
            }
            Err((kafka_err, _)) => {
                // Si Kafka está caído, casi seguro el resto del batch
                // también va a fallar: cortamos acá en vez de esperar
                // KAFKA_SEND_TIMEOUT por cada una de las BATCH_SIZE filas
                // restantes, lo que dejaría la transacción (y sus locks)
                // abierta minutos. Lo ya marcado PROCESSED en este batch
                // se commitea igual; el resto queda PENDING y se
                // reintenta en el próximo poll — la venta ya está
                // persistida en la DB de todos modos.
                tracing::error!(
                    event_id = %outbox_row.id,
                    "fallo al publicar en Kafka, se corta el batch: {kafka_err}"
                );
                break;
            }
        }
    }

    tx.commit().await?;
    Ok(())
}
