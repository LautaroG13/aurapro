import { apiFetch } from "./client";
import type {
  CustomerCreate,
  CustomerRead,
  CustomerTypeCreate,
  CustomerTypeRead,
  CustomerUpdate,
} from "./types";

export async function listCustomers(): Promise<CustomerRead[]> {
  return apiFetch<CustomerRead[]>("/api/v1/customers");
}

export async function createCustomer(payload: CustomerCreate): Promise<CustomerRead> {
  return apiFetch<CustomerRead>("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  customerId: string,
  payload: CustomerUpdate
): Promise<CustomerRead> {
  return apiFetch<CustomerRead>(`/api/v1/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/customers/${customerId}`, { method: "DELETE" });
}

// customer-types va registrado en el mismo router de FastAPI bajo
// /customers/types (ver customers/routes.py) -- no es un recurso
// aparte a nivel de URL, aunque acá vive en funciones separadas.
export async function listCustomerTypes(): Promise<CustomerTypeRead[]> {
  return apiFetch<CustomerTypeRead[]>("/api/v1/customers/types");
}

export async function createCustomerType(payload: CustomerTypeCreate): Promise<CustomerTypeRead> {
  return apiFetch<CustomerTypeRead>("/api/v1/customers/types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerType(typeId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/customers/types/${typeId}`, { method: "DELETE" });
}
