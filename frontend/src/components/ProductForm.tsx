"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createCategory, createProduct, listCategories, updateProduct } from "@/lib/api/products";
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
  const [categoryId, setCategoryId] = useState(editingProduct?.category_id ?? "");
  const [sku, setSku] = useState(editingProduct?.sku ?? "");
  const [barcode, setBarcode] = useState(editingProduct?.barcode ?? "");
  const [imageUrl, setImageUrl] = useState(editingProduct?.image_url ?? "");
  const [isActive, setIsActive] = useState(editingProduct?.is_active ?? true);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoriesQuery = useQuery({ queryKey: ["productCategories"], queryFn: listCategories });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        price: Number(price),
        cost: cost ? Number(cost) : null,
        current_stock: Number(currentStock),
        category_id: categoryId || null,
        sku: sku || null,
        barcode: barcode || null,
        image_url: imageUrl || null,
        is_active: isActive,
      };
      return editingProduct ? updateProduct(editingProduct.id, payload) : createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => createCategory({ name: newCategoryName }),
    onSuccess: (createdCategory) => {
      queryClient.invalidateQueries({ queryKey: ["productCategories"] });
      setCategoryId(createdCategory.id);
      setNewCategoryName("");
      setIsCreatingCategory(false);
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

      <div className="flex flex-col gap-2">
        <label className="aura-label">
          Categoría
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="aura-input"
          >
            <option value="">Sin categoría</option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {isCreatingCategory ? (
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nombre (ej. Remeras)"
              className="aura-input"
            />
            <button
              type="button"
              disabled={createCategoryMutation.isPending || newCategoryName.trim() === ""}
              onClick={() => createCategoryMutation.mutate()}
              className="aura-btn-primary px-3 py-1"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingCategory(false);
                setNewCategoryName("");
              }}
              className="aura-btn-secondary px-3 py-1"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingCategory(true)}
            className="aura-btn-secondary self-start px-2 py-1 text-sm"
          >
            + Nueva categoría
          </button>
        )}
      </div>

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

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activo (visible para vender)
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
