/**
 * Espeja backend/app/schemas/stock_alert.py::StockAlertResponse campo a
 * campo. Si el modelo de Pydantic cambia, actualizar acá también.
 */
export interface StockAlertResponse {
  product_id: string;
  days_until_out_of_stock: number | null;
  confidence: number;
}

/**
 * Espeja backend/app/schemas/system_status.py::ServiceStatus.
 */
export interface ServiceStatus {
  name: string;
  healthy: boolean;
  detail: string | null;
}

/**
 * Espeja backend/app/schemas/system_status.py::SystemStatusResponse.
 */
export interface SystemStatusResponse {
  postgres: ServiceStatus;
  redis: ServiceStatus;
  kafka: ServiceStatus;
}

/**
 * Espeja backend/app/schemas/system_status.py::OutboxStatsResponse.
 */
export interface OutboxStatsResponse {
  pending_count: number;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::TokenResponse.
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantRead.
 */
export interface ProductVariantRead {
  id: string;
  product_id: string;
  attributes: Record<string, string>;
  stock: number;
  created_at: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantCreate.
 */
export interface ProductVariantCreate {
  attributes?: Record<string, string>;
  stock?: number;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantUpdate.
 * Todos los campos opcionales -- PATCH parcial, igual que el backend.
 */
export interface ProductVariantUpdate {
  attributes?: Record<string, string>;
  stock?: number;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductRead.
 */
export interface ProductRead {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  current_stock: number;
  category: string | null;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  variants: ProductVariantRead[];
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductCreate.
 */
export interface ProductCreate {
  name: string;
  description?: string | null;
  price: number;
  cost?: number | null;
  current_stock?: number;
  category?: string | null;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductUpdate.
 * Todos los campos opcionales -- PATCH parcial, igual que el backend.
 */
export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  cost?: number | null;
  current_stock?: number;
  category?: string | null;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
}

/**
 * Espeja backend/app/modules/customers/schemas.py::CustomerRead.
 */
export interface CustomerRead {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleItemCreate.
 */
export interface SaleItemCreate {
  product_id: string;
  quantity: number;
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleCreate. Sin
 * unit_price ni total_amount a propósito -- el backend los calcula, ver
 * el comentario en el schema de Python.
 */
export interface SaleCreate {
  customer_id: string;
  payment_method: string;
  currency?: string;
  items: SaleItemCreate[];
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleItemRead.
 */
export interface SaleItemRead {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleRead.
 */
export interface SaleRead {
  id: string;
  tenant_id: string;
  customer_id: string;
  total_amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  payment_method: string;
  created_at: string;
  items: SaleItemRead[];
}

/**
 * Espeja backend/app/modules/admin/schemas.py::TenantCreateAdmin.
 */
export interface TenantCreateAdmin {
  tenant_name: string;
  admin_email: string;
  admin_password: string;
}

/**
 * Espeja backend/app/modules/admin/schemas.py::TenantSummary.
 */
export interface TenantSummary {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  is_active: boolean;
}

/**
 * Espeja backend/app/modules/admin/schemas.py::GlobalStats.
 */
export interface GlobalStats {
  total_tenants: number;
  total_users: number;
  total_products: number;
  total_customers: number;
  total_sales: number;
  total_revenue: number;
}
