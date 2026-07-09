import { apiFetch } from "./client";
import type { ProductCreate, ProductRead, ProductUpdate } from "./types";

export async function listProducts(): Promise<ProductRead[]> {
  return apiFetch<ProductRead[]>("/api/v1/products");
}

export async function createProduct(payload: ProductCreate): Promise<ProductRead> {
  return apiFetch<ProductRead>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(productId: string, payload: ProductUpdate): Promise<ProductRead> {
  return apiFetch<ProductRead>(`/api/v1/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/${productId}`, { method: "DELETE" });
}
