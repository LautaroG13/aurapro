import { apiFetch, apiFetchBlob } from "./client";
import type { SaleCreate, SaleRead } from "./types";

export async function createSale(payload: SaleCreate): Promise<SaleRead> {
  return apiFetch<SaleRead>("/api/v1/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listSales(): Promise<SaleRead[]> {
  return apiFetch<SaleRead[]>("/api/v1/sales");
}

// Dispara la descarga del PDF en el navegador -- el link no puede ser
// un <a href> directo porque el endpoint requiere el Bearer token, así
// que se trae como blob y se simula el click sobre un <a> temporal.
export async function downloadSaleReceipt(saleId: string): Promise<void> {
  const blob = await apiFetchBlob(`/api/v1/sales/${saleId}/receipt`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `venta-${saleId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
