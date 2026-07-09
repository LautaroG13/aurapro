"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createProduct, updateProduct } from "@/lib/api/products";
import type { ProductRead } from "@/lib/api/types";

import { ProductVariants } from "./ProductVariants";

interface ProductFormProps {
  editingProduct: ProductRead | null;
  onDone: () => void;
}

export function ProductForm({ editingProduct, onDone }: ProductFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editingProduct?.name ?? "");
  const [description, setDescription] = useState(editingProduct?.description ?? "");
  const [price, setPrice] = useState(editingProduct ? String(editingProduct.price) : "");
  const [cost, setCost] = useState(editingProduct?.cost != null ? String(editingProduct.cost) : "");
  const [currentStock, setCurrentStock] = useState(
    editingProduct ? String(editingProduct.current_stock) : "0"
  );
  const [category, setCategory] = useState(editingProduct?.category ?? "");
  const [sku, setSku] = useState(editingProduct?.sku ?? "");
  const [barcode, setBarcode] = useState(editingProduct?.barcode ?? "");
  const [imageUrl, setImageUrl] = useState(editingProduct?.image_url ?? "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        price: Number(price),
        cost: cost ? Number(cost) : null,
        current_stock: Number(currentStock),
        category: category || null,
        sku: sku || null,
        barcode: barcode || null,
        image_url: imageUrl || null,
      };
      return editingProduct ? updateProduct(editingProduct.id, payload) : createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="aura-card flex flex-col gap-4"
    >
      <h2>{editingProduct ? "Editar producto" : "Nuevo producto"}</h2>

      <label className="aura-label">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} required className="aura-input" />
      </label>

      <label className="aura-label">
        Descripción
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Precio
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Costo
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Stock actual
        <input
          type="number"
          min="0"
          step="1"
          value={currentStock}
          onChange={(e) => setCurrentStock(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Categoría
        <input value={category} onChange={(e) => setCategory(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        SKU
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Código de barras
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        URL de imagen
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="aura-input" />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={saveMutation.isPending} className="aura-btn-primary self-start">
          {saveMutation.isPending ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}
        </button>
        <button type="button" onClick={onDone} className="aura-btn-secondary self-start">
          Cancelar
        </button>
      </div>

      {saveMutation.isError && (
        <p role="alert" className="aura-alert">
          {(saveMutation.error as Error).message}
        </p>
      )}

      {editingProduct && <ProductVariants product={editingProduct} />}
    </form>
  );
}
