import { apiFetch, apiFetchBlob } from "./client";
import type { QuoteCreate, QuoteRead, QuoteStatus } from "./types";

export async function createQuote(payload: QuoteCreate): Promise<QuoteRead> {
  return apiFetch<QuoteRead>("/api/v1/quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listQuotes(): Promise<QuoteRead[]> {
  return apiFetch<QuoteRead[]>("/api/v1/quotes");
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<QuoteRead> {
  return apiFetch<QuoteRead>(`/api/v1/quotes/${quoteId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Mismo patrón que downloadSaleReceipt -- el endpoint requiere el
// Bearer token, no puede ser un <a href> directo.
export async function downloadQuoteReceipt(quoteId: string): Promise<void> {
  const blob = await apiFetchBlob(`/api/v1/quotes/${quoteId}/receipt`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `presupuesto-${quoteId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
