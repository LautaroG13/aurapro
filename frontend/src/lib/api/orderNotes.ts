import { apiFetch, apiFetchBlob } from "./client";
import type { OrderNoteCreate, OrderNoteRead, OrderNoteStatus } from "./types";

export async function createOrderNote(payload: OrderNoteCreate): Promise<OrderNoteRead> {
  return apiFetch<OrderNoteRead>("/api/v1/order-notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listOrderNotes(): Promise<OrderNoteRead[]> {
  return apiFetch<OrderNoteRead[]>("/api/v1/order-notes");
}

export async function getOrderNote(orderNoteId: string): Promise<OrderNoteRead> {
  return apiFetch<OrderNoteRead>(`/api/v1/order-notes/${orderNoteId}`);
}

export async function updateOrderNoteStatus(
  orderNoteId: string,
  status: OrderNoteStatus
): Promise<OrderNoteRead> {
  return apiFetch<OrderNoteRead>(`/api/v1/order-notes/${orderNoteId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Mismo patrón que downloadSaleReceipt/downloadQuoteReceipt.
export async function downloadOrderNoteReceipt(orderNoteId: string): Promise<void> {
  const blob = await apiFetchBlob(`/api/v1/order-notes/${orderNoteId}/receipt`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nota-pedido-${orderNoteId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
