# Desplegar AuraPro en Render

Guía de 3 pasos para conectar este repo a Render con el Blueprint
(`render.yaml`) que ya está en la raíz. Leé primero la sección
**"Lo que este Blueprint NO resuelve"** más abajo — hay dos cosas que
necesitan un paso manual tuyo antes de que el sistema funcione de
punta a punta, no son opcionales.

## Los 3 pasos

### 1. Pushear el repo a GitHub

Si `AuraPro/` no es todavía un repo de GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create aurapro --private --source=. --push
```

(o creá el repo desde github.com y `git remote add origin ... && git push -u origin main`).

### 2. Conectar el Blueprint en Render

1. Entrá a [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Conectá tu cuenta de GitHub (si no lo hiciste antes) y elegí el repo `aurapro`.
3. Render lee `render.yaml` y te muestra una **vista previa** de todo lo que va a crear: `aurapro-backend`, `aurapro-frontend`, `aurapro-postgres`. **Revisá esta pantalla con cuidado** — es donde aparecería cualquier error de sintaxis del archivo, antes de gastar ningún recurso.
4. Click en **Apply** (o **Create New Resources**, según la versión del dashboard).

Render arranca los 3 builds. El backend y el Postgres no dependen de nada más y deberían quedar arriba solos. El frontend va a arrancar, pero **no vas a poder usarlo todavía** — sigue al paso 3.

### 3. Completar las variables que Render no puede inferir solo

El Blueprint deja 4 variables marcadas como `sync: false` (Render te las va a pedir en el dashboard, no las adivina): `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `REDIS_URL`, `KAFKA_BOOTSTRAP_SERVERS`. Las dos primeras son necesarias para que el sistema funcione en absoluto; las últimas dos son necesarias para que funcione *completo* (ver la sección de abajo).

1. Andá a **aurapro-backend** → **Environment**, copiá la URL pública que Render le asignó (algo como `https://aurapro-backend-xxxx.onrender.com`).
2. Andá a **aurapro-frontend** → **Environment** → seteá:
   - `NEXT_PUBLIC_API_URL` = esa URL del backend (con `https://`, sin `/` al final).
3. **Importante**: esta variable se hornea en el bundle en build time, no en runtime — cambiarla no alcanza con un restart. Andá a **aurapro-frontend** → **Manual Deploy** → **Clear build cache & deploy**.
4. Andá a **aurapro-backend** → **Environment** → seteá:
   - `CORS_ORIGINS` = `["https://aurapro-frontend-xxxx.onrender.com"]` (la URL real del frontend, formato JSON de lista aunque sea un solo valor — así lo parsea `pydantic-settings`).
5. Verificá: abrí la URL del frontend, andá a `/sales`, logueate. Si el login funciona pero la lista de productos/clientes no carga, es casi seguro `NEXT_PUBLIC_API_URL` sin aplicar (repetí el paso 3) o `CORS_ORIGINS` mal seteado (mirá la consola del navegador: un error de CORS ahí lo confirma).

A partir de acá, **cada `git push` a la rama conectada dispara un deploy automático** de los tres servicios (comportamiento default de los Blueprints de Render) — no hace falta repetir nada de esto.

---

## Lo que este Blueprint NO resuelve

**No pude probar `render.yaml` contra una cuenta real de Render** (no tengo acceso a una). Lo escribí siguiendo la especificación documentada de Blueprints, pero algunos nombres de campo pueden haber cambiado — la vista previa del paso 2 es tu primera validación real.

**Redis y Kafka no están en este Blueprint.** El pedido fue específicamente "Backend + Frontend + Postgres", y eso es lo que armé. Pero el sistema también necesita:
- **Redis** — lo usan `analytics-engine` (métricas y pronósticos de stock) y `GET /api/v1/system/status` / `GET /api/v1/analytics/stock-alert`.
- **Kafka** — lo usan `workers/` (outbox-processor, worker-processor) y `analytics-engine`.

Sin esto, **el backend igual arranca y responde** (esas conexiones son diferidas, no bloquean el startup) — pero esos endpoints puntuales van a fallar o devolver `healthy: false`. Opciones para resolverlo:
- Redis: Render tiene un servicio de Key-Value gestionado (buscá "Redis" al crear un servicio nuevo) — agregalo y apuntá `REDIS_URL` ahí.
- Kafka: Render no ofrece Kafka gestionado. Necesitás un proveedor externo (ej. [Upstash Kafka](https://upstash.com/), Confluent Cloud) y apuntar `KAFKA_BOOTSTRAP_SERVERS` a ese broker.
- Si no te importa esa parte del sistema por ahora, dejalas sin setear — el resto (auth, products, customers, sales, admin) funciona igual.

**El plan `free` de Render tiene límites reales**, no son solo "más lento":
- Postgres free: **se borra a los 90 días**. Para algo que va a tener datos de clientes reales, cambiá `plan: free` a `plan: starter` en `render.yaml` antes del primer deploy (después de tener datos, cambiar de plan en Postgres de Render implica migrar).
- Web services free: se "duermen" tras ~15 min sin tráfico, y el primer request después tarda ~30-60s en responder (cold start). Para producción real, `starter` o superior.

**`SECRET_KEY`** lo genera Render solo (`generateValue: true`) — no vas a verlo en ningún archivo del repo, lo cual es correcto. Si alguna vez necesitás rotarlo (ej. sospecha de compromiso), hacelo desde el dashboard de Render, no editando `render.yaml`.
