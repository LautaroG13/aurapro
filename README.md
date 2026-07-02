# AuraPro

Plataforma de venta e inventario con arquitectura **event-driven**: cada
venta es un evento inmutable que atraviesa el sistema vía Kafka, y las
decisiones automatizadas (pronóstico de quiebre de stock, generación de
órdenes de compra) son reacciones a esos eventos, no lógica acoplada al
request original.

## 1. Introducción

### Por qué event-driven

El dato canónico de "una venta ocurrió" no vive en una sola tabla que
todos consultan: vive como un evento (`VentaRealizada`) publicado en
Kafka, del cual cada servicio deriva su propia vista:

- **backend** lo persiste como fila de negocio en Postgres.
- **analytics-engine** lo agrega en métricas de velocidad de venta y
  pronósticos de stock, en Redis.
- **workers** (Rust) lo consumen para procesamiento de alta performance.

Ningún servicio le pregunta a otro "¿cuál es el estado actual?" por
RPC directo. Se enteran por el evento, o leen una vista ya calculada en
Redis. Esto es deliberado — ver [§5 Reglas de Diseño](#5-reglas-de-diseño).

### Stack

| Capa | Tecnología | Rol |
|---|---|---|
| API | FastAPI (Python) | Backend de negocio, endpoints REST, dueño de Postgres |
| Trabajadores de alta performance | Rust | Drena la tabla outbox a Kafka; valida y consume eventos con jsonschema+serde |
| Bus de eventos | Kafka + Zookeeper | Transporte de eventos entre servicios, desacoplado |
| Analítica en tiempo real | Python (aiokafka + Darts) | Consume ventas, mantiene métricas en Redis, pronostica quiebre de stock |
| Base transaccional | PostgreSQL | Ventas, outbox, órdenes de compra |
| Caché / métricas / frontera entre servicios | Redis | Ventanas móviles de venta, pronósticos, deduplicación |
| Frontend | Next.js + TanStack Query | Dashboard de negocio y de salud del sistema |

### Estructura del repo

```
AuraPro/
├── backend/            FastAPI — API REST, dueño de Postgres
├── workers/             Rust — outbox-processor, worker-processor
├── analytics-engine/    Python — consumer Kafka + métricas Redis + forecast Darts
├── frontend/            Next.js
├── infra/               DDL de Postgres, config de Kafka
├── shared/schemas/      Contratos de eventos (JSON Schema) — fuente única de verdad
└── docker-compose.yml   Kafka, Zookeeper, Postgres, Redis, Kafka UI
```

## 2. Quick Start

### Requisitos

- Docker y Docker Compose
- Python 3.12+
- Rust (stable, vía rustup) — solo si vas a tocar `workers/`
- Node.js 20+

### Levantar todo (infra + backend + frontend)

```bash
docker compose up -d --build
```

Un solo comando levanta las 7 piezas: `zookeeper`, `kafka`, `kafka-ui`,
`postgres`, `redis`, `backend` y `frontend`. `backend` y `frontend` se
buildean desde sus `Dockerfile` (`--build` la primera vez o después de
cambiar código; sin `--build` en corridas subsiguientes si no cambió
nada). No hace falta `.env` para este camino: los defaults de
`backend/app/core/config.py` ya son los hostnames internos de Docker
(`postgres`, `redis`, `kafka`) — `.env` solo aplica si corrés backend o
frontend directo en el host (ver más abajo).

| Servicio | Puerto host | Notas |
|---|---|---|
| Frontend (Next.js) | `3000` | |
| Backend (FastAPI) | `8000` | |
| Zookeeper | `2181` | |
| Kafka | `29092` (host) / `9092` (red interna de Docker) | |
| Kafka UI | `8080` | Inspección de topics en el navegador |
| PostgreSQL | `55432` (host) / `5432` (red interna de Docker) | user/pass/db: `aurapro`. Puerto host remapeado porque 5432 suele estar ocupado por instalaciones nativas de Postgres (ej. Postgres.app en Mac) |
| Redis | `6379` | |

**Nota sobre `NEXT_PUBLIC_API_URL`**: se hornea en el bundle del cliente
en build time (Next.js lo hace así, no es negociable), no en runtime —
por eso `docker-compose.yml` lo pasa como `build.args`, no como
`environment:`. Si cambiás el puerto publicado del backend, hay que
rebuildear el frontend (`docker compose up -d --build frontend`), un
`restart` no alcanza.

**Nota sobre `SECRET_KEY`**: el default (`change-me`) es exactamente
eso — un placeholder de desarrollo. No hay gestión de secretos en este
proyecto todavía; si esto sale de tu máquina, hace falta resolver eso
antes (fuera del alcance de este README).

**Si `docker compose logs postgres` muestra `psql:/docker-entrypoint-initdb.d/init.sql: error: could not read from input file: Resource deadlock would occur`**: es un bug conocido de Docker Desktop en Mac (VirtioFS) leyendo el bind mount de `infra/docker/postgres/`, no un error del SQL — confirmado reproducible incluso montando el directorio completo en vez del archivo suelto. `\dt` va a mostrar 0 tablas. Workaround (no requiere tocar nada del repo):

```bash
docker compose exec -T postgres psql -U aurapro -d aurapro < infra/docker/postgres/init.sql
```

Esto corre el mismo SQL vía `docker exec` (stdin), evitando por completo la lectura del bind mount. Verificá con `docker compose exec -T postgres psql -U aurapro -d aurapro -c '\dt'` que aparezcan `outbox`, `purchase_orders` y `purchase_order_items`.

**Persistencia**: `outbox`, `purchase_orders` y `purchase_order_items`
viven en el volumen nombrado `aurapro_postgres_data` — un `docker
compose restart postgres` (o del stack completo) no pierde datos;
solo `docker compose down -v` (con `-v`) borra el volumen a propósito.
Verificado insertando una fila, reiniciando el contenedor, y
confirmando que seguía ahí.

### Alternativa: backend y frontend corriendo en el host (hot-reload)

Para desarrollo activo con recarga en caliente, es más cómodo correr
backend/frontend directo en el host contra la infra en Docker, en vez
de rebuildear la imagen en cada cambio:

```bash
cp .env.example .env
docker compose up -d zookeeper kafka kafka-ui postgres redis
```

`backend/app/core/config.py` tiene como default los nombres de
contenedor (`postgres`, `redis`, `kafka`); el `.env` de la raíz (el
mismo que usa `docker compose`, ya lo copiaste arriba) los sobrescribe
a `localhost` con los puertos publicados al host.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Levantar el frontend (Next.js)

```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Levantar analytics-engine (opcional, para ver métricas/forecast en vivo)

```bash
cd analytics-engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.main   # consumer de Kafka, corre indefinidamente
```

### Levantar los workers de Rust (opcional)

```bash
cd workers
cargo run -p outbox-processor    # drena outbox -> Kafka
cargo run -p worker-processor    # consumer de ejemplo, valida VentaRealizada
```

## 3. Flujo de Trabajo

De "se registró una venta" a "se generó sola una orden de compra":

```
1. Backend registra una venta
   └─ INSERT en la tabla de negocio + INSERT en `outbox`
      (evento VentaRealizada), MISMA transacción de Postgres.
      (app/services/sales_events.py)

2. outbox-processor (Rust) hace polling de outbox WHERE status='PENDING'
   └─ publica en Kafka (topic aurapro.events.venta_realizada)
   └─ marca la fila PROCESSED
      (workers/crates/outbox-processor)

3. analytics-engine consume el topic
   └─ valida el evento (Pydantic, mismo contrato que el backend)
   └─ dedupea por event_id (por si Kafka reentrega)
   └─ actualiza en Redis:
        sales:velocity:{tenant}:{product}  (ventana móvil, buckets de 1 min)
        sales:daily:{tenant}:{product}     (historial diario)
      (analytics-engine/app/consumer.py)

4. scripts/forecast_stockout.py (batch, Darts) lee sales:daily:*,
   entrena ExponentialSmoothing, cruza contra inventory:stock:*
   └─ escribe inventory:forecast:{tenant}:{product} en Redis (TTL 24h)

5. Backend expone GET /api/v1/analytics/stock-alert/{product_id}
   └─ lee el forecast + el stock *actual* (no el de cuando corrió el
      batch) y recalcula days_until_out_of_stock en caliente
      (app/services/stock_alerts.py)

6. scripts/auto_purchaser.py (backend, batch/cron) reusa el mismo
   cálculo del paso 5. Si days_until_out_of_stock < threshold Y no hay
   ya una PurchaseOrder DRAFT/SENT abierta en las últimas 24h:
   └─ INSERT PurchaseOrder + PurchaseOrderItem + INSERT en outbox
      (evento OrdenCompraGenerada), MISMA transacción
      (app/services/purchase_orders.py)
   └─ vuelve al paso 2: outbox-processor lo drena a
      aurapro.events.orden_compra_generada
```

El ciclo se cierra en Kafka, no en un endpoint: hoy nada consume
`aurapro.events.orden_compra_generada` todavía (sería, por ejemplo, un
futuro servicio de notificación a proveedores) — el punto es que el
evento ya existe y es consumible por cualquiera que se suscriba, sin
tocar el backend.

### Topics de Kafka

| Topic | Evento | Productor | Consumidores actuales |
|---|---|---|---|
| `aurapro.events.venta_realizada` | `VentaRealizada` | outbox-processor | analytics-engine, worker-processor |
| `aurapro.events.orden_compra_generada` | `OrdenCompraGenerada` | outbox-processor | ninguno todavía |

### Claves de Redis

| Clave | Tipo | Escrita por | Leída por |
|---|---|---|---|
| `sales:velocity:{tenant}:{product}` | HASH (bucket/min) | analytics-engine | (disponible para cualquier consulta de "venta de los últimos 15 min") |
| `sales:daily:{tenant}:{product}` | HASH (bucket/día) | analytics-engine | `forecast_stockout.py` |
| `sales:processed:{event_id}` | STRING (dedup, TTL 24h) | analytics-engine | analytics-engine (a sí mismo) |
| `inventory:stock:{tenant}:{product}` | STRING | *(sin dueño todavía — input manual/externo)* | `stock_alerts.py`, `auto_purchaser.py` |
| `inventory:forecast:{tenant}:{product}` | STRING JSON (TTL 24h) | `forecast_stockout.py` | `stock_alerts.py`, `auto_purchaser.py` |

`inventory:stock:*` es una convención asumida, no un servicio real: el
proyecto todavía no tiene un módulo de inventario que la escriba en
producción. Sembrarla a mano para probar: `redis-cli SET
inventory:stock:tenant-1:sku-1 500`.

## 4. Contratos

`shared/schemas/*.json` (JSON Schema, draft 2020-12) es la **fuente
única de verdad** de cada evento — no un DTO de Python ni un struct de
Rust. Todo binding de lenguaje es una proyección de ese archivo, nunca
al revés:

- `sales_event.json` → `VentaRealizada`
- `purchase_order_event.json` → `OrdenCompraGenerada`

Cada schema tiene `additionalProperties: false` en **todos los
niveles** — un campo no declarado rompe la validación en vez de pasar
silencioso. Cada servicio tiene su propio binding, deliberadamente
duplicado en vez de importado entre servicios (ver §5):

| Servicio | Lenguaje | Mecanismo |
|---|---|---|
| `backend/app/schemas/` | Python | Pydantic, `extra="forbid"` |
| `analytics-engine/app/schemas/` | Python | Pydantic, `extra="forbid"` (copia independiente de la del backend) |
| `workers/crates/worker-core/src/schemas/` | Rust | `jsonschema` (`Lazy<JSONSchema>`, compila el `.json` una sola vez) + `serde` para el tipado post-validación |

**Si cambiás un contrato**: actualizá el `.json` primero, después los
tres bindings. Un test que compare `Model.model_json_schema()` contra
el `.json` (Python) evitaría que se desincronicen en silencio — no
existe todavía, es la mejora obvia si esto crece.

## 5. Reglas de Diseño

Principios que se fueron estableciendo a lo largo de la construcción de
este sistema y que cualquier cambio nuevo debería respetar:

1. **Un servicio no importa el código de otro.** `analytics-engine` no
   importa el paquete `app` del backend aunque ambos hablen
   `VentaRealizada` — cada uno tiene su propio binding Pydantic del
   mismo `shared/schemas/*.json`. Son deployables independientes; la
   única coordinación válida entre ellos es infraestructura (Kafka,
   Redis), nunca un `import` cruzado.

2. **Redis como frontera, no como acoplamiento.** `analytics-engine`
   escribe pronósticos y métricas; el backend los lee. Ninguno conoce
   el código del otro — solo una convención de claves documentada
   (§3). Cambiar la implementación interna de un lado no rompe al otro
   mientras la clave y su forma se mantengan.

3. **Validación estricta en cada frontera, no solo una vez.** El
   contrato se valida en el productor (Pydantic al construir el
   evento) y otra vez en cada consumidor (Pydantic en analytics-engine,
   `jsonschema` en Rust) — nunca se asume que "ya vino validado".
   `additionalProperties: false` en todos los niveles: un campo extra
   debe romper, no colarse.

4. **Transactional Outbox para toda escritura que dispare un evento.**
   Nunca se publica a Kafka desde el mismo código que escribe el dato
   de negocio. Se escribe una fila de negocio + una fila de `outbox`
   en la misma transacción de Postgres; un worker aparte (Rust) drena
   `outbox` a Kafka. Así una venta nunca se pierde por un Kafka caído,
   y nunca se publica un evento de algo que después no se pudo
   persistir.

5. **Idempotencia explícita en cada consumidor, no implícita.** El
   outbox garantiza *at-least-once*, no exactly-once — cualquier
   consumidor puede recibir un evento duplicado. `analytics-engine`
   dedupea por `event_id` (`SET NX`); `auto_purchaser.py` chequea
   explícitamente si ya existe una orden abierta antes de crear otra.
   Si agregás un consumidor nuevo, esa pregunta ("¿qué pasa si esto
   llega dos veces?") no es opcional.

6. **Los external boundaries no se ocultan, se exponen.** El fallo de
   Postgres/Redis/Kafka en `/api/v1/system/status` no se traga ni se
   convierte en un 200 optimista — se propaga como 503 con el detalle
   de cuál servicio falló y por qué. Lo mismo aplica a la validación de
   contratos: un evento inválido se loguea y se descarta explícitamente,
   nunca se ignora en silencio.

7. **No dupliques un stack de infraestructura por conveniencia
   puntual.** El backend es 100% síncrono en su acceso a Postgres
   (SQLAlchemy + psycopg2). Los endpoints que necesitan ser async de
   verdad (`/system/status`, `/system/outbox-stats`) envuelven esas
   llamadas con `asyncio.to_thread` en vez de sumar un engine async
   (asyncpg) en paralelo solo para esos dos endpoints.

8. **Config: defaults para Docker, override para el host.** Los
   defaults de `config.py` asumen ejecución dentro de la red de Docker
   Compose (nombres de servicio). El `.env` de la raíz —el mismo que
   usa `docker compose`, no uno nuevo por servicio— es lo único que
   cambia para correr un servicio directo en el host.

## 6. Cómo Verificar el Sistema

Pasos concretos para confirmar que frontend → backend → (Postgres,
Redis, Kafka) están realmente conectados, no solo que cada pieza
compila por separado.

### 6.1 Todo arriba

```bash
docker compose up -d --build
docker compose ps        # los 7 servicios en estado "running"/"healthy"
```

### 6.2 Backend puede hablar con Postgres, Redis y Kafka

```bash
curl -s http://localhost:8000/api/v1/system/status | python3 -m json.tool
```

- **200 OK** con `postgres.healthy`, `redis.healthy` y `kafka.healthy`
  en `true` → el backend efectivamente abrió conexión con los tres.
- **503** → el body trae, por servicio, `healthy: false` y `detail`
  con el error real de conexión (ej. `could not translate host name
  "postgres"` si estás corriendo el backend en el host sin haber
  copiado `.env`, o el broker de Kafka todavía no terminó de levantar).
  Este endpoint existe específicamente para no tener que adivinar cuál
  de los tres servicios es el que falla.

Confirmá también el backlog del outbox (debería ser `0` o un número
chico si no estuviste generando ventas):

```bash
curl -s http://localhost:8000/api/v1/system/outbox-stats
```

### 6.3 Frontend puede hablar con el backend

Abrí `http://localhost:3000` en el navegador. El componente
`SystemMonitor` hace polling cada 10s a los dos endpoints de arriba:
tres círculos (verde = sano, rojo = caído, con el detalle del error al
lado) más el contador de backlog del outbox. Si los tres círculos están
verdes acá, la cadena completa **frontend → backend (FastAPI) →
Postgres/Redis/Kafka** está confirmada de punta a punta.

Si preferís no abrir un navegador, el mismo chequeo desde la terminal:

```bash
curl -s "http://localhost:8000/api/v1/analytics/stock-alert/sku-1?tenant_id=tenant-1"
```
(esperá un `404` si todavía no corriste `forecast_stockout.py` para ese
producto — es la respuesta correcta, no un error del sistema).

### 6.4 Ciclo completo (venta → evento → métrica → forecast → PO), opcional

1. `cd workers && cargo run -p outbox-processor` (deja corriendo).
2. `cd analytics-engine && python -m app.main` (deja corriendo).
3. Insertá manualmente una fila de outbox con un evento `VentaRealizada`
   válido contra `shared/schemas/sales_event.json` (o disparalo desde
   el flujo de negocio real una vez que exista un endpoint de venta).
4. Verificá en Kafka UI (`http://localhost:8080`) que el mensaje llegó
   al topic `aurapro.events.venta_realizada`.
5. `redis-cli HGETALL sales:daily:tenant-1:sku-1` → debería reflejar la
   cantidad vendida.
6. `redis-cli SET inventory:stock:tenant-1:sku-1 50` (sembrar stock).
7. `cd analytics-engine && python -m scripts.forecast_stockout --tenant-id tenant-1 --product-id sku-1`
   → escribe `inventory:forecast:tenant-1:sku-1`.
8. `cd backend && python -m scripts.auto_purchaser --tenant-id tenant-1 --product-id sku-1 --reorder-quantity 200 --unit-cost 8.5`
   → si el forecast cruza el threshold, crea la `PurchaseOrder` y el
   evento `OrdenCompraGenerada` vuelve a aparecer en Kafka UI.

### 6.5 Estado de verificación conocido

Esta sección es honesta a propósito: no todo en este repo fue probado
contra infraestructura real durante su construcción (el entorno de
desarrollo no siempre tuvo Docker/Postgres/`cargo` disponibles).

- **Verificado con ejecución real**: todos los contratos Pydantic
  contra sus `.json` (con `jsonschema`), la lógica de ventana móvil y
  dedup en Redis (con `fakeredis`), el forecast de Darts con datos
  sintéticos, los endpoints de FastAPI (con `TestClient`, incluyendo
  los casos de fallo reales de `/system/status` sin infraestructura
  levantada), y el frontend (`tsc --noEmit` + `npm run build`
  completo).
- **Sin verificar contra infraestructura real todavía**: el código Rust
  (`workers/`) nunca se compiló en este entorno de desarrollo (no había
  `cargo` disponible) — correr `cargo build && cargo test` en
  `workers/` antes de confiar en él. Los `INSERT` reales en
  `purchase_orders`/`outbox` tampoco se ejecutaron contra un Postgres
  vivo — seguí la guía de §6.4 para cerrar ese gap antes de un deploy.
