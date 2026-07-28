import { apiFetch, apiFetchBlob, apiFetchUpload } from "./client";
import type { TenantProfileRead, TenantProfileUpdate } from "./types";

export async function getTenantProfile(): Promise<TenantProfileRead> {
  return apiFetch<TenantProfileRead>("/api/v1/auth/tenant");
}

export async function updateTenantProfile(payload: TenantProfileUpdate): Promise<TenantProfileRead> {
  return apiFetch<TenantProfileRead>("/api/v1/auth/tenant", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadTenantLogo(file: File): Promise<TenantProfileRead> {
  return apiFetchUpload<TenantProfileRead>("/api/v1/auth/tenant/logo", file);
}

// Blob, no URL directa: GET /auth/tenant/logo requiere el Bearer
// token, un <img src> plano no lo manda -- se arma un object URL como
// en downloadSaleReceipt.
export async function getTenantLogoObjectUrl(): Promise<string> {
  const blob = await apiFetchBlob("/api/v1/auth/tenant/logo");
  return URL.createObjectURL(blob);
}
