import { apiFetch } from "./client";
import type { IntegrationConfigUpsert, IntegrationRead } from "./types";

export async function listIntegrations(): Promise<IntegrationRead[]> {
  return apiFetch<IntegrationRead[]>("/api/v1/integrations");
}

export async function upsertIntegration(
  provider: string,
  payload: IntegrationConfigUpsert
): Promise<IntegrationRead> {
  return apiFetch<IntegrationRead>(`/api/v1/integrations/${encodeURIComponent(provider)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteIntegration(provider: string): Promise<void> {
  return apiFetch<void>(`/api/v1/integrations/${encodeURIComponent(provider)}`, { method: "DELETE" });
}
