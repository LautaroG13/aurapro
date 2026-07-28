import { apiFetch } from "./client";
import type {
  CashMovementCreate,
  CashMovementRead,
  CashSessionClose,
  CashSessionOpen,
  CashSessionRead,
  CustomerAccountRead,
  CustomerBalanceRead,
  CustomerPaymentCreate,
  PaymentMethodSummary,
} from "./types";

export async function listCustomerAccounts(): Promise<CustomerBalanceRead[]> {
  return apiFetch<CustomerBalanceRead[]>("/api/v1/treasury/customer-accounts");
}

export async function getCustomerAccount(customerId: string): Promise<CustomerAccountRead> {
  return apiFetch<CustomerAccountRead>(`/api/v1/treasury/customers/${customerId}/account`);
}

export async function createCustomerPayment(
  customerId: string,
  payload: CustomerPaymentCreate
) {
  return apiFetch(`/api/v1/treasury/customers/${customerId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentCashSession(): Promise<CashSessionRead | null> {
  return apiFetch<CashSessionRead | null>("/api/v1/treasury/cash/sessions/current");
}

export async function openCashSession(payload: CashSessionOpen): Promise<CashSessionRead> {
  return apiFetch<CashSessionRead>("/api/v1/treasury/cash/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function closeCashSession(
  sessionId: string,
  payload: CashSessionClose
): Promise<CashSessionRead> {
  return apiFetch<CashSessionRead>(`/api/v1/treasury/cash/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCashSessionSalesSummary(sessionId: string): Promise<PaymentMethodSummary[]> {
  return apiFetch<PaymentMethodSummary[]>(`/api/v1/treasury/cash/sessions/${sessionId}/sales-summary`);
}

export async function addCashMovement(
  sessionId: string,
  payload: CashMovementCreate
): Promise<CashMovementRead> {
  return apiFetch<CashMovementRead>(`/api/v1/treasury/cash/sessions/${sessionId}/movements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
