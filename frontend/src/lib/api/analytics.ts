import { apiFetch } from "./client";
import type { StockAlertResponse } from "./types";

// El tenant lo resuelve el backend a partir del JWT (ver
// analytics.py::stock_alert) -- ya no se manda como query param.
export async function getStockAlert(productId: string): Promise<StockAlertResponse> {
  return apiFetch<StockAlertResponse>(`/api/v1/analytics/stock-alert/${encodeURIComponent(productId)}`);
}
