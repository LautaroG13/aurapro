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
  sku: string | null;
  stock: number;
  created_at: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantCreate.
 */
export interface ProductVariantCreate {
  attributes?: Record<string, string>;
  sku?: string | null;
  stock?: number;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantUpdate.
 * Todos los campos opcionales -- PATCH parcial, igual que el backend.
 */
export interface ProductVariantUpdate {
  attributes?: Record<string, string>;
  sku?: string | null;
  stock?: number;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductVariantBulkCreate.
 */
export interface ProductVariantBulkCreate {
  variants: ProductVariantCreate[];
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
  wholesale_price: number | null;
  current_stock: number;
  category_id: string | null;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  variants: ProductVariantRead[];
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductCategoryRead.
 */
export interface ProductCategoryRead {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductCategoryCreate.
 */
export interface ProductCategoryCreate {
  name: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductAttributeValueRead.
 */
export interface ProductAttributeValueRead {
  id: string;
  attribute_id: string;
  value: string;
  created_at: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductAttributeValueCreate.
 */
export interface ProductAttributeValueCreate {
  value: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductAttributeRead.
 */
export interface ProductAttributeRead {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  values: ProductAttributeValueRead[];
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductAttributeCreate.
 */
export interface ProductAttributeCreate {
  name: string;
}

/**
 * Espeja backend/app/modules/products/schemas.py::ProductCreate.
 */
export interface ProductCreate {
  name: string;
  description?: string | null;
  price: number;
  cost?: number | null;
  wholesale_price?: number | null;
  current_stock?: number;
  category_id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  is_active?: boolean;
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
  wholesale_price?: number | null;
  current_stock?: number;
  category_id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Espeja backend/app/modules/customers/schemas.py::CustomerTypeRead.
 */
export interface CustomerTypeRead {
  id: string;
  tenant_id: string;
  name: string;
  is_wholesale: boolean;
  created_at: string;
}

/**
 * Espeja backend/app/modules/customers/schemas.py::CustomerTypeCreate.
 */
export interface CustomerTypeCreate {
  name: string;
  is_wholesale?: boolean;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::SalespersonRead.
 */
export interface SalespersonRead {
  id: string;
  email: string;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::UserRead.
 */
export interface UserRead {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "ADMIN" | "VENDEDOR" | "VIEWER";
  is_superadmin: boolean;
  created_at: string;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::UserUpdate.
 */
export interface UserUpdate {
  first_name?: string | null;
  last_name?: string | null;
  role?: "ADMIN" | "VENDEDOR" | "VIEWER";
  new_password?: string | null;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::ForgotPasswordRequest.
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::ResetPasswordRequest.
 */
export interface ResetPasswordRequest {
  password: string;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::InvitationCreate.
 */
export interface InvitationCreate {
  email: string;
  role: "ADMIN" | "VENDEDOR" | "VIEWER";
}

/**
 * Espeja backend/app/modules/identity/schemas.py::InvitationRead.
 */
export interface InvitationRead {
  id: string;
  email: string;
  role: "ADMIN" | "VENDEDOR" | "VIEWER";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::InvitationPreview.
 */
export interface InvitationPreview {
  tenant_name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR" | "VIEWER";
}

/**
 * Espeja backend/app/modules/customers/models.py::CustomerTaxStatus.
 */
export type CustomerTaxStatus = "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTO" | "EXENTO";

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
  credit_limit: number | null;
  default_salesperson_id: string | null;
  customer_type_id: string | null;
  cuit: string | null;
  tax_status: CustomerTaxStatus | null;
  created_at: string;
}

/**
 * Espeja backend/app/modules/customers/schemas.py::CustomerCreate.
 */
export interface CustomerCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  credit_limit?: number | null;
  default_salesperson_id?: string | null;
  customer_type_id?: string | null;
  cuit?: string | null;
  tax_status?: CustomerTaxStatus | null;
}

/**
 * Espeja backend/app/modules/customers/schemas.py::CustomerUpdate.
 * Todos los campos opcionales -- PATCH parcial, igual que el backend.
 */
export interface CustomerUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  credit_limit?: number | null;
  default_salesperson_id?: string | null;
  customer_type_id?: string | null;
  cuit?: string | null;
  tax_status?: CustomerTaxStatus | null;
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleItemCreate.
 */
export interface SaleItemCreate {
  product_id: string;
  variant_id?: string | null;
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
  card_coupon_number?: string | null;
  card_authorization_code?: string | null;
}

/**
 * Espeja backend/app/modules/sales/schemas.py::SaleItemRead.
 */
export interface SaleItemRead {
  id: string;
  product_id: string;
  variant_id: string | null;
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
  sale_number: number;
  total_amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  payment_method: string;
  card_coupon_number: string | null;
  card_authorization_code: string | null;
  created_at: string;
  items: SaleItemRead[];
}

/**
 * Espeja backend/app/modules/quotes/models.py::QuoteStatus.
 */
export type QuoteStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

/**
 * Espeja backend/app/modules/quotes/schemas.py::QuoteItemCreate.
 */
export interface QuoteItemCreate {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

/**
 * Espeja backend/app/modules/quotes/schemas.py::QuoteCreate.
 */
export interface QuoteCreate {
  customer_id: string;
  currency?: string;
  valid_until?: string | null;
  items: QuoteItemCreate[];
}

/**
 * Espeja backend/app/modules/quotes/schemas.py::QuoteItemRead.
 */
export interface QuoteItemRead {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
}

/**
 * Espeja backend/app/modules/quotes/schemas.py::QuoteRead.
 */
export interface QuoteRead {
  id: string;
  tenant_id: string;
  customer_id: string;
  quote_number: number;
  total_amount: number;
  currency: string;
  status: QuoteStatus;
  valid_until: string | null;
  created_at: string;
  items: QuoteItemRead[];
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::AccountMovementRead.
 */
export interface AccountMovementRead {
  id: string;
  customer_id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string | null;
  sale_id: string | null;
  created_at: string;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CustomerAccountRead.
 */
export interface CustomerAccountRead {
  customer_id: string;
  balance: number;
  movements: AccountMovementRead[];
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CustomerBalanceRead.
 */
export interface CustomerBalanceRead {
  customer_id: string;
  customer_name: string;
  balance: number;
  credit_limit: number | null;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CustomerPaymentCreate.
 */
export interface CustomerPaymentCreate {
  amount: number;
  payment_method: string;
  description?: string | null;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CashMovementRead.
 */
export interface CashMovementRead {
  id: string;
  cash_session_id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  sale_id: string | null;
  created_at: string;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CashMovementCreate.
 */
export interface CashMovementCreate {
  type: "INCOME" | "EXPENSE";
  amount: number;
  description?: string | null;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::PaymentMethodSummary.
 */
export interface PaymentMethodSummary {
  payment_method: string;
  count: number;
  total_amount: number;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CashSessionRead.
 */
export interface CashSessionRead {
  id: string;
  opening_amount: number;
  status: "OPEN" | "CLOSED";
  closed_at: string | null;
  closing_amount_declared: number | null;
  closing_amount_expected: number | null;
  created_at: string;
  movements: CashMovementRead[];
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CashSessionOpen.
 */
export interface CashSessionOpen {
  opening_amount: number;
}

/**
 * Espeja backend/app/modules/treasury/schemas.py::CashSessionClose.
 */
export interface CashSessionClose {
  closing_amount_declared: number;
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

/**
 * Espeja backend/app/modules/integrations/schemas.py::IntegrationConfigUpsert.
 * Write-only: config viaja acá pero nunca vuelve en una respuesta.
 */
export interface IntegrationConfigUpsert {
  config: Record<string, string>;
}

/**
 * Espeja backend/app/modules/integrations/schemas.py::IntegrationRead.
 */
export interface IntegrationRead {
  provider: string;
  config_keys: string[];
  updated_at: string;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::TenantProfileRead.
 * Mismo enum de situación fiscal que CustomerTaxStatus (compartido en
 * el backend vía app/shared/tax_status.py).
 */
export interface TenantProfileRead {
  name: string;
  cuit: string | null;
  address: string | null;
  phone: string | null;
  business_email: string | null;
  tax_status: CustomerTaxStatus | null;
  has_logo: boolean;
}

/**
 * Espeja backend/app/modules/identity/schemas.py::TenantProfileUpdate.
 */
export interface TenantProfileUpdate {
  name?: string | null;
  cuit?: string | null;
  address?: string | null;
  phone?: string | null;
  business_email?: string | null;
  tax_status?: CustomerTaxStatus | null;
}
