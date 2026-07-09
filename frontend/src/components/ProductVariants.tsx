"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createVariant, deleteVariant, listProducts, updateVariant } from "@/lib/api/products";
import type { ProductRead, ProductVariantRead } from "@/lib/api/types";

interface AttributePair {
  key: string;
  value: string;
}

function attributesToPairs(attributes: Record<string, string>): AttributePair[] {
  const pairs = Object.entries(attributes).map(([key, value]) => ({ key, value }));
  return pairs.length > 0 ? pairs : [{ key: "", value: "" }];
}

function pairsToAttributes(pairs: AttributePair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.filter((pair) => pair.key.trim() !== "").map((pair) => [pair.key.trim(), pair.value])
  );
}

interface VariantAttributesEditorProps {
  initialAttributes: Record<string, string>;
  initialStock: number;
  isSaving: boolean;
  onSave: (attributes: Record<string, string>, stock: number) => void;
  onCancel: () => void;
}

function VariantAttributesEditor({
  initialAttributes,
  initialStock,
  isSaving,
  onSave,
  onCancel,
}: VariantAttributesEditorProps) {
  const [pairs, setPairs] = useState<AttributePair[]>(attributesToPairs(initialAttributes));
  const [stock, setStock] = useState(String(initialStock));

  return (
    <div className="flex flex-col gap-2 rounded border border-neutral-700 p-3">
      {pairs.map((pair, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={pair.key}
            onChange={(e) =>
              setPairs(pairs.map((p, i) => (i === index ? { ...p, key: e.target.value } : p)))
            }
            placeholder="Atributo (ej. color)"
            className="aura-input"
          />
          <input
            value={pair.value}
            onChange={(e) =>
              setPairs(pairs.map((p, i) => (i === index ? { ...p, value: e.target.value } : p)))
            }
            placeholder="Valor (ej. rojo)"
            className="aura-input"
          />
          <button
            type="button"
            onClick={() => setPairs(pairs.filter((_, i) => i !== index))}
            disabled={pairs.length === 1}
            className="aura-btn-secondary px-2"
          >
            -
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPairs([...pairs, { key: "", value: "" }])}
        className="aura-btn-secondary self-start px-2"
      >
        + Atributo
      </button>

      <label className="aura-label">
        Stock
        <input
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="aura-input"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(pairsToAttributes(pairs), Number(stock))}
          className="aura-btn-primary px-3 py-1"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className="aura-btn-secondary px-3 py-1">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function formatAttributes(attributes: Record<string, string>): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return "(sin atributos)";
  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}

interface ProductVariantsProps {
  product: ProductRead;
}

export function ProductVariants({ product }: ProductVariantsProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Comparte queryKey con ProductsTable -- React Query dedupea, no
  // dispara un fetch extra. Necesario para que la lista de variantes
  // no quede stale con el snapshot de `product` que llegó por props
  // (page.tsx no lo resincroniza cuando se invalida ["products"]).
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const liveProduct = productsQuery.data?.find((p) => p.id === product.id) ?? product;

  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const createMutation = useMutation({
    mutationFn: (payload: { attributes: Record<string, string>; stock: number }) =>
      createVariant(product.id, payload),
    onSuccess: () => {
      invalidateProducts();
      setIsAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { variantId: string; attributes: Record<string, string>; stock: number }) =>
      updateVariant(product.id, vars.variantId, {
        attributes: vars.attributes,
        stock: vars.stock,
      }),
    onSuccess: () => {
      invalidateProducts();
      setEditingVariantId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(product.id, variantId),
    onSuccess: invalidateProducts,
  });

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-700 pt-4">
      <h3>Variantes</h3>

      {liveProduct.variants.length === 0 && !isAdding && (
        <p className="text-sm text-neutral-500">Sin variantes todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {liveProduct.variants.map((variant: ProductVariantRead) =>
          editingVariantId === variant.id ? (
            <li key={variant.id}>
              <VariantAttributesEditor
                initialAttributes={variant.attributes}
                initialStock={variant.stock}
                isSaving={updateMutation.isPending}
                onSave={(attributes, stock) =>
                  updateMutation.mutate({ variantId: variant.id, attributes, stock })
                }
                onCancel={() => setEditingVariantId(null)}
              />
            </li>
          ) : (
            <li key={variant.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {formatAttributes(variant.attributes)} — stock: {variant.stock}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVariantId(variant.id)}
                  className="aura-btn-secondary px-2 py-1"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Borrar esta variante?")) {
                      deleteMutation.mutate(variant.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="aura-btn-danger px-2 py-1"
                >
                  Borrar
                </button>
              </span>
            </li>
          )
        )}
      </ul>

      {isAdding ? (
        <VariantAttributesEditor
          initialAttributes={{}}
          initialStock={0}
          isSaving={createMutation.isPending}
          onSave={(attributes, stock) => createMutation.mutate({ attributes, stock })}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="aura-btn-secondary self-start">
          + Agregar variante
        </button>
      )}

      {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <p role="alert" className="aura-alert">
          {(
            (createMutation.error ?? updateMutation.error ?? deleteMutation.error) as Error
          ).message}
        </p>
      )}
    </div>
  );
}
