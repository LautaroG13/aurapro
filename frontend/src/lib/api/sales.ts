import { apiFetch } from "./client";
import type { SaleCreate, SaleRead } from "./types";

export async function createSale(payload: SaleCreate): Promise<SaleRead> {
  return apiFetch<SaleRead>("/api/v1/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
