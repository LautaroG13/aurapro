import { apiFetch } from "./client";
import type {
  ProductAttributeCreate,
  ProductAttributeRead,
  ProductAttributeValueCreate,
  ProductAttributeValueRead,
  ProductCategoryCreate,
  ProductCategoryRead,
  ProductCreate,
  ProductRead,
  ProductUpdate,
  ProductVariantBulkCreate,
  ProductVariantCreate,
  ProductVariantRead,
  ProductVariantUpdate,
} from "./types";

export async function listProducts(): Promise<ProductRead[]> {
  return apiFetch<ProductRead[]>("/api/v1/products");
}

export async function listCategories(): Promise<ProductCategoryRead[]> {
  return apiFetch<ProductCategoryRead[]>("/api/v1/products/categories");
}

export async function createCategory(payload: ProductCategoryCreate): Promise<ProductCategoryRead> {
  return apiFetch<ProductCategoryRead>("/api/v1/products/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/categories/${categoryId}`, { method: "DELETE" });
}

export async function listAttributes(): Promise<ProductAttributeRead[]> {
  return apiFetch<ProductAttributeRead[]>("/api/v1/products/attributes");
}

export async function createAttribute(payload: ProductAttributeCreate): Promise<ProductAttributeRead> {
  return apiFetch<ProductAttributeRead>("/api/v1/products/attributes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/attributes/${attributeId}`, { method: "DELETE" });
}

export async function createAttributeValue(
  attributeId: string,
  payload: ProductAttributeValueCreate
): Promise<ProductAttributeValueRead> {
  return apiFetch<ProductAttributeValueRead>(`/api/v1/products/attributes/${attributeId}/values`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAttributeValue(attributeId: string, valueId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/attributes/${attributeId}/values/${valueId}`, {
    method: "DELETE",
  });
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

export async function createVariant(
  productId: string,
  payload: ProductVariantCreate
): Promise<ProductVariantRead> {
  return apiFetch<ProductVariantRead>(`/api/v1/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createVariantsBulk(
  productId: string,
  payload: ProductVariantBulkCreate
): Promise<ProductVariantRead[]> {
  return apiFetch<ProductVariantRead[]>(`/api/v1/products/${productId}/variants/bulk`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVariant(
  productId: string,
  variantId: string,
  payload: ProductVariantUpdate
): Promise<ProductVariantRead> {
  return apiFetch<ProductVariantRead>(`/api/v1/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
  });
}
