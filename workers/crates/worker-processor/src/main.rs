use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::Message;
use worker_core::config::Config;
use worker_core::kafka::build_consumer;
use worker_core::schemas::sales_event::{parse_and_validate, SalesEventError};

const TOPIC: &str = "aurapro.events.venta_realizada";
const GROUP_ID: &str = "worker-processor";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;
    let consumer: StreamConsumer = build_consumer(&config.kafka_bootstrap_servers, GROUP_ID)?;
    consumer.subscribe(&[TOPIC])?;

    tracing::info!("worker-processor listening on topic {TOPIC}");

    loop {
        match consumer.recv().await {
            Ok(message) => {
                let Some(payload) = message.payload() else {
                    tracing::warn!("mensaje sin payload, se descarta");
                    continue;
                };

                match parse_and_validate(payload) {
                    Ok(event) => {
                        tracing::info!(
                            event_id = %event.event_id,
                            tenant_id = %event.tenant_id,
                            amount = event.transaction_amount.amount,
                            "VentaRealizada válida"
                        );
                        // TODO: procesar el evento (persistir, side effects, etc.)
                    }
                    Err(SalesEventError::SchemaViolation(msg)) => {
                        tracing::error!("evento no cumple el contrato, se descarta: {msg}");
                        // No hacer panic: un solo evento inválido no debe tumbar el worker.
                    }
                    Err(SalesEventError::InvalidJson(err)) => {
                        tracing::error!("payload no es JSON válido, se descarta: {err}");
                    }
                }
            }
            Err(err) => tracing::error!("kafka error: {err}"),
        }
    }
}
