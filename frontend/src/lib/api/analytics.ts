import type { StockAlertResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getStockAlert(
  productId: string,
  tenantId: string,
): Promise<StockAlertResponse> {
  const url = `${API_URL}/api/v1/analytics/stock-alert/${encodeURIComponent(productId)}?tenant_id=${encodeURIComponent(tenantId)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status} al obtener el pronóstico de stock`);
  }

  return (await res.json()) as StockAlertResponse;
}
