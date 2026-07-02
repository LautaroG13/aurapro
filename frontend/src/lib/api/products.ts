import { apiFetch } from "./client";
import type { ProductRead } from "./types";

export async function listProducts(): Promise<ProductRead[]> {
  return apiFetch<ProductRead[]>("/api/v1/products");
}
