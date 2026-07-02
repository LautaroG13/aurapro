//! Validación y tipado del evento VentaRealizada.
//!
//! El JSON Schema en `shared/schemas/sales_event.json` es la fuente de
//! verdad del contrato. Este módulo hace dos cosas separadas:
//!
//! 1. Valida el payload crudo contra ese schema con `jsonschema`, así se
//!    detecta cualquier violación del contrato (tipos, requeridos, campos
//!    extra, patrones) sin importar si el struct de Rust está desactualizado.
//! 2. Recién si la validación pasa, deserializa a un struct tipado con
//!    `serde` para uso ergonómico en el resto del worker.
//!
//! Si sólo se usara `serde`, un payload con un campo mal tipado que
//! igual matchee el struct (o con un campo extra ignorado) pasaría
//! silenciosamente. El schema es la validación de contrato; serde es
//! la conveniencia de tipado una vez que el contrato ya se cumplió.

use chrono::{DateTime, Utc};
use jsonschema::{Draft, JSONSchema};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

const SCHEMA_STR: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../shared/schemas/sales_event.json"
));

static SALES_EVENT_SCHEMA: Lazy<JSONSchema> = Lazy::new(|| {
    let schema: Value =
        serde_json::from_str(SCHEMA_STR).expect("shared/schemas/sales_event.json no es JSON válido");
    JSONSchema::options()
        .with_draft(Draft::Draft202012)
        .compile(&schema)
        .expect("shared/schemas/sales_event.json no compila como JSON Schema válido")
});

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProductDetail {
    pub product_id: String,
    pub name: String,
    pub quantity: u32,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TransactionAmount {
    pub amount: f64,
    pub currency: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SalesEvent {
    pub event_id: Uuid,
    pub event_type: String,
    pub schema_version: String,
    pub timestamp: DateTime<Utc>,
    pub tenant_id: String,
    pub product_details: Vec<ProductDetail>,
    pub transaction_amount: TransactionAmount,
}

#[derive(Debug, thiserror::Error)]
pub enum SalesEventError {
    #[error("payload no es JSON válido: {0}")]
    InvalidJson(#[from] serde_json::Error),

    #[error("payload no cumple sales_event.json: {0}")]
    SchemaViolation(String),
}

/// Valida `raw` contra `shared/schemas/sales_event.json` y, si pasa,
/// lo deserializa a `SalesEvent`. Usar esto (no `serde_json::from_slice`
/// directo) al leer mensajes del topic `aurapro.events.venta_realizada`.
pub fn parse_and_validate(raw: &[u8]) -> Result<SalesEvent, SalesEventError> {
    let value: Value = serde_json::from_slice(raw)?;

    if let Err(errors) = SALES_EVENT_SCHEMA.validate(&value) {
        let message = errors
            .map(|e| format!("{} (en {})", e, e.instance_path))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(SalesEventError::SchemaViolation(message));
    }

    let event: SalesEvent = serde_json::from_value(value)?;
    Ok(event)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_payload() -> Vec<u8> {
        serde_json::json!({
            "event_id": "b3f1c9a0-4e2b-4c1a-9a3e-1234567890ab",
            "event_type": "VentaRealizada",
            "schema_version": "1.0.0",
            "timestamp": "2026-07-01T14:32:00Z",
            "tenant_id": "tenant-42",
            "product_details": [
                {"product_id": "sku-1", "name": "Widget", "quantity": 2, "unit_price": 19.99}
            ],
            "transaction_amount": {"amount": 39.98, "currency": "USD"}
        })
        .to_string()
        .into_bytes()
    }

    #[test]
    fn schema_loads_and_compiles_from_json_file() {
        // Fuerza la evaluación de la Lazy: si include_str! apuntara a una
        // ruta rota, o shared/schemas/sales_event.json no fuera JSON Schema
        // válido, `compile()` hace panic acá y el test falla, aislado de
        // cualquier lógica de validación de payloads.
        let schema = &*SALES_EVENT_SCHEMA;
        assert!(schema.validate(&serde_json::json!({})).is_err());
    }

    #[test]
    fn accepts_valid_payload() {
        let event = parse_and_validate(&valid_payload()).expect("debería validar");
        assert_eq!(event.tenant_id, "tenant-42");
    }

    #[test]
    fn rejects_missing_required_field() {
        let mut value: Value = serde_json::from_slice(&valid_payload()).unwrap();
        value.as_object_mut().unwrap().remove("transaction_amount");
        let raw = serde_json::to_vec(&value).unwrap();

        let err = parse_and_validate(&raw).unwrap_err();
        assert!(matches!(err, SalesEventError::SchemaViolation(_)));
    }

    #[test]
    fn rejects_extra_field() {
        let mut value: Value = serde_json::from_slice(&valid_payload()).unwrap();
        value
            .as_object_mut()
            .unwrap()
            .insert("unexpected_field".into(), Value::String("nope".into()));
        let raw = serde_json::to_vec(&value).unwrap();

        let err = parse_and_validate(&raw).unwrap_err();
        assert!(matches!(err, SalesEventError::SchemaViolation(_)));
    }
}
