import { apiFetch } from "./client";
import type { CustomerRead } from "./types";

export async function listCustomers(): Promise<CustomerRead[]> {
  return apiFetch<CustomerRead[]>("/api/v1/customers");
}
