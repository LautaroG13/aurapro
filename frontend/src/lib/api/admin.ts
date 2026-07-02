import { apiFetch } from "./client";
import type { GlobalStats, TenantCreateAdmin, TenantSummary } from "./types";

export async function listTenants(): Promise<TenantSummary[]> {
  return apiFetch<TenantSummary[]>("/api/v1/admin/tenants");
}

export async function createTenant(payload: TenantCreateAdmin): Promise<TenantSummary> {
  return apiFetch<TenantSummary>("/api/v1/admin/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGlobalStats(): Promise<GlobalStats> {
  return apiFetch<GlobalStats>("/api/v1/admin/stats");
}

export async function suspendTenant(tenantId: string): Promise<TenantSummary> {
  return apiFetch<TenantSummary>(`/api/v1/admin/tenants/${tenantId}/suspend`, { method: "POST" });
}

export async function activateTenant(tenantId: string): Promise<TenantSummary> {
  return apiFetch<TenantSummary>(`/api/v1/admin/tenants/${tenantId}/activate`, { method: "POST" });
}
