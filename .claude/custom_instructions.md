# Instrucciones de Desarrollo: Sistema de Gestión (Aura)

## Arquitectura Base
- API: FastAPI (Python)
- Workers: Rust
- Base de Datos: PostgreSQL
- Message Broker: Apache Kafka
- Frontend: Next.js

## Reglas Inquebrantables
1. Todo es Event-Driven. Si un servicio necesita datos de otro, usa un evento en Kafka.
2. Multi-tenancy: Todas las consultas a la base de datos deben filtrar por `tenant_id` (ID del comercio).
3. Performance: Si es una tarea pesada (cálculo de IA o procesamiento de streams), debe hacerse en Rust.
4. Código: Usa siempre Type Hints en Python y `serde` en Rust.

## Estructura de Proyecto
- /services: Contiene cada microservicio.
- /infrastructure: Docker compose y configuraciones.
- /shared: Schemas y contratos compartidos.