-- Ejecutado automáticamente al crear el contenedor de Postgres.
-- Agregar extensiones o setup inicial de la base aquí.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patrón Transactional Outbox: la fila de negocio (ej. una venta) y la
-- fila de outbox se insertan en la misma transacción de la app, así que
-- o quedan las dos persistidas o ninguna. Un worker separado
-- (workers/crates/outbox-processor) hace polling de status = 'PENDING',
-- publica en Kafka y marca PROCESSED — Kafka nunca se toca dentro de la
-- transacción que registra la venta.
CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED'))
);

-- Índice parcial: solo indexa filas PENDING, que es exactamente el
-- filtro + orden que usa el polling (WHERE status = 'PENDING' ORDER BY
-- created_at). Las filas PROCESSED (la mayoría con el tiempo) no lo tocan.
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox (created_at)
    WHERE status = 'PENDING';

-- Compra automatizada: backend/scripts/auto_purchaser.py crea la orden
-- (DRAFT) y su evento OrdenCompraGenerada en outbox dentro de la misma
-- transacción. Ver backend/app/models/purchase_orders.py.
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sirve tanto el listado por tenant como el chequeo de idempotencia
-- (¿ya existe una PO DRAFT/SENT para este tenant en las últimas 24h?).
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status_created_at
    ON purchase_orders (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost > 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id
    ON purchase_order_items (purchase_order_id);

-- El chequeo de idempotencia hace JOIN purchase_orders x
-- purchase_order_items filtrando por product_id.
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id
    ON purchase_order_items (product_id);

-- Identity / multi-tenancy (app/modules/identity, app/shared/tenant_model.py).
-- Nota de migración: outbox/purchase_orders (arriba) usan tenant_id TEXT
-- de forma laxa; acá tenant_id es un UUID real con FK a tenants.id. Los
-- módulos nuevos (Products, Sales, Finance, Customers) van a seguir este
-- patrón, no el de arriba -- cuando Sales/Finance se migren a
-- app/modules/, su tenant_id debería pasar a ser este mismo tipo de FK.
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    -- Suspender (app/modules/admin) baja esto a false; se aplica en el
    -- login (identity/services.py::authenticate_user).
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALTER idempotente para bases ya provisionadas antes de que is_active
-- existiera.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'VENDEDOR', 'VIEWER')),
    -- Acceso de plataforma (app/modules/admin), ortogonal a `role`. Sin
    -- endpoint que lo setee -- solo un UPDATE directo en la base por un
    -- operador. Ver el comentario largo en app/db/tenant_session.py
    -- sobre qué habilita exactamente.
    is_superadmin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Único a nivel global, no por tenant: el login busca por email antes
    -- de saber de qué tenant es (ver identity/services.py).
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- ALTER idempotente para bases ya provisionadas antes de que
-- is_superadmin existiera (el CREATE TABLE de arriba no las toca).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);

-- Products (app/modules/products). UUID de punta a punta -- a
-- diferencia de purchase_order_items.product_id (TEXT, arriba), este es
-- el id real que va a referenciar SaleItem cuando se implemente Sales.
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);

-- Customers (app/modules/customers).
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id);

-- Sales (app/modules/sales). Cierra el ciclo: crear una venta también
-- inserta un evento VentaRealizada en `outbox` (arriba), MISMA
-- transacción -- ver app/modules/sales/services.py::create_sale.
-- RESTRICT en customer_id/product_id: no se puede borrar un
-- Customer/Product con ventas asociadas (ver el 409 que devuelven
-- products/customers al intentarlo).
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_id ON sale_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
