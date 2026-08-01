"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
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
  const [wholesalePrice, setWholesalePrice] = useState(
    editingProduct?.wholesale_price != null ? String(editingProduct.wholesale_price) : ""
  );
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
        wholesale_price: wholesalePrice ? Number(wholesalePrice) : null,
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
      className="flex flex-col gap-4 rounded-base border border-border bg-surface p-5"
    >
      <h2 className="font-display text-[14.5px] font-semibold text-text">
        {editingProduct ? "Editar producto" : "Nuevo producto"}
      </h2>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Nombre
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Descripción
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Precio
        <Input
          className="font-mono"
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Costo
        <Input
          className="font-mono"
          type="number"
          min="0.01"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Precio mayorista (opcional)
        <Input
          className="font-mono"
          type="number"
          min="0.01"
          step="0.01"
          value={wholesalePrice}
          onChange={(e) => setWholesalePrice(e.target.value)}
          placeholder="Se usa con clientes de tipo mayorista"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Stock actual
        <Input
          className="font-mono"
          type="number"
          min="0"
          step="1"
          value={currentStock}
          onChange={(e) => setCurrentStock(e.target.value)}
          required
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
          Categoría
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        {categoriesQuery.isError && (
          <p className="text-xs text-danger">
            No se pudieron cargar las categorías: {(categoriesQuery.error as Error).message}
          </p>
        )}

        {isCreatingCategory ? (
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nombre (ej. Remeras)"
            />
            <Button
              type="button"
              variant="primary"
              className="px-3 py-1"
              disabled={createCategoryMutation.isPending || newCategoryName.trim() === ""}
              onClick={() => createCategoryMutation.mutate()}
            >
              Crear
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1"
              onClick={() => {
                setIsCreatingCategory(false);
                setNewCategoryName("");
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="self-start px-2 py-1 text-xs"
            onClick={() => setIsCreatingCategory(true)}
          >
            + Nueva categoría
          </Button>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        SKU
        <Input className="font-mono" value={sku} onChange={(e) => setSku(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Código de barras
        <Input className="font-mono" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        URL de imagen
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </label>

      <label className="flex items-center gap-2 font-body text-[13.5px] font-medium text-text">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activo (visible para vender)
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="self-start" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button type="button" variant="secondary" className="self-start" onClick={onDone}>
          Cancelar
        </Button>
      </div>

      {saveMutation.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(saveMutation.error as Error).message}
        </p>
      )}

      {editingProduct && <ProductVariants product={editingProduct} />}
    </form>
  );
}
