import { apiFetch } from "./client";
import type { DashboardPaymentMethodTotal, DashboardSummary, DashboardTopProduct, RevenuePoint } from "./types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/api/v1/dashboard/summary");
}

export async function getRevenueTimeseries(days = 14): Promise<RevenuePoint[]> {
  return apiFetch<RevenuePoint[]>(`/api/v1/dashboard/revenue-timeseries?days=${days}`);
}

export async function getTopProducts(limit = 5): Promise<DashboardTopProduct[]> {
  return apiFetch<DashboardTopProduct[]>(`/api/v1/dashboard/top-products?limit=${limit}`);
}

export async function getPaymentMethodTotals(): Promise<DashboardPaymentMethodTotal[]> {
  return apiFetch<DashboardPaymentMethodTotal[]>("/api/v1/dashboard/payment-methods");
}
