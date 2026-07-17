"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createVariant,
  createVariantsBulk,
  deleteVariant,
  listProducts,
  updateVariant,
} from "@/lib/api/products";
import type { ProductRead, ProductVariantCreate, ProductVariantRead } from "@/lib/api/types";

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
  initialSku: string | null;
  initialStock: number;
  isSaving: boolean;
  onSave: (attributes: Record<string, string>, sku: string | null, stock: number) => void;
  onCancel: () => void;
}

function VariantAttributesEditor({
  initialAttributes,
  initialSku,
  initialStock,
  isSaving,
  onSave,
  onCancel,
}: VariantAttributesEditorProps) {
  const [pairs, setPairs] = useState<AttributePair[]>(attributesToPairs(initialAttributes));
  const [sku, setSku] = useState(initialSku ?? "");
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
        SKU (opcional)
        <input value={sku} onChange={(e) => setSku(e.target.value)} className="aura-input" />
      </label>

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
          onClick={() =>
            onSave(pairsToAttributes(pairs), sku.trim() === "" ? null : sku.trim(), Number(stock))
          }
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

interface AttributeAxis {
  name: string;
  valuesRaw: string;
}

interface GeneratedRow {
  attributes: Record<string, string>;
  sku: string;
  stock: string;
}

function cartesianProduct(axes: { name: string; values: string[] }[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (combos, axis) => combos.flatMap((combo) => axis.values.map((value) => ({ ...combo, [axis.name]: value }))),
    [{}]
  );
}

// Quita acentos y cualquier caracter que no sea alfanumérico -- un SKU
// no debería depender de que el usuario haya tipeado "Café" vs "cafe"
// de forma consistente.
function skuPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function buildAutoSku(productSku: string | null, attributes: Record<string, string>): string {
  // El SKU del producto se usa literal (no se le aplica skuPart): si ya
  // tiene guiones propios (ej. "REM-001"), quedan intactos como prefijo
  // -- solo los valores de los atributos se normalizan.
  const parts = [productSku ?? "", ...Object.values(attributes).map(skuPart)].filter(Boolean);
  return parts.join("-");
}

interface VariantCombinationGeneratorProps {
  productSku: string | null;
  isSaving: boolean;
  onCreate: (variants: ProductVariantCreate[]) => void;
  onCancel: () => void;
}

function VariantCombinationGenerator({
  productSku,
  isSaving,
  onCreate,
  onCancel,
}: VariantCombinationGeneratorProps) {
  const [axes, setAxes] = useState<AttributeAxis[]>([{ name: "", valuesRaw: "" }]);
  const [rows, setRows] = useState<GeneratedRow[] | null>(null);

  const parsedAxes = axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: axis.valuesRaw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== ""),
    }))
    .filter((axis) => axis.name !== "" && axis.values.length > 0);

  const handleGenerate = () => {
    const combos = cartesianProduct(parsedAxes);
    setRows(
      combos.map((attributes) => ({
        attributes,
        sku: buildAutoSku(productSku, attributes),
        stock: "0",
      }))
    );
  };

  if (rows === null) {
    return (
      <div className="flex flex-col gap-3 rounded border border-neutral-700 p-3">
        <p className="text-sm text-neutral-400">
          Definí uno o más atributos con sus valores posibles (separados por coma). Se generará una
          variante por cada combinación.
        </p>
        {axes.map((axis, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={axis.name}
              onChange={(e) =>
                setAxes(axes.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)))
              }
              placeholder="Atributo (ej. Color)"
              className="aura-input"
            />
            <input
              value={axis.valuesRaw}
              onChange={(e) =>
                setAxes(axes.map((a, i) => (i === index ? { ...a, valuesRaw: e.target.value } : a)))
              }
              placeholder="Valores (ej. Negro, Blanco, Gris)"
              className="aura-input flex-1"
            />
            <button
              type="button"
              onClick={() => setAxes(axes.filter((_, i) => i !== index))}
              disabled={axes.length === 1}
              className="aura-btn-secondary px-2"
            >
              -
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAxes([...axes, { name: "", valuesRaw: "" }])}
          className="aura-btn-secondary self-start px-2"
        >
          + Atributo
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={parsedAxes.length === 0}
            onClick={handleGenerate}
            className="aura-btn-primary px-3 py-1"
          >
            Generar combinaciones
          </button>
          <button type="button" onClick={onCancel} className="aura-btn-secondary px-3 py-1">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const attributeNames = parsedAxes.map((axis) => axis.name);

  return (
    <div className="flex flex-col gap-3 rounded border border-neutral-700 p-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400">
              {attributeNames.map((name) => (
                <th key={name} className="px-2 py-1">
                  {name}
                </th>
              ))}
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-neutral-800">
                {attributeNames.map((name) => (
                  <td key={name} className="px-2 py-1">
                    {row.attributes[name]}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <input
                    value={row.sku}
                    onChange={(e) =>
                      setRows(rows.map((r, i) => (i === index ? { ...r, sku: e.target.value } : r)))
                    }
                    className="aura-input"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.stock}
                    onChange={(e) =>
                      setRows(rows.map((r, i) => (i === index ? { ...r, stock: e.target.value } : r)))
                    }
                    className="aura-input w-24"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onCreate(
              rows.map((row) => ({
                attributes: row.attributes,
                sku: row.sku.trim() === "" ? null : row.sku.trim(),
                stock: Number(row.stock) || 0,
              }))
            )
          }
          className="aura-btn-primary px-3 py-1"
        >
          {isSaving ? "Creando..." : `Crear las ${rows.length} variantes`}
        </button>
        <button type="button" onClick={() => setRows(null)} className="aura-btn-secondary px-3 py-1">
          Volver a los atributos
        </button>
        <button type="button" onClick={onCancel} className="aura-btn-secondary px-3 py-1">
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface ProductVariantsProps {
  product: ProductRead;
}

type AddMode = "none" | "single" | "generate";

export function ProductVariants({ product }: ProductVariantsProps) {
  const queryClient = useQueryClient();
  const [addMode, setAddMode] = useState<AddMode>("none");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Comparte queryKey con ProductsTable -- React Query dedupea, no
  // dispara un fetch extra. Necesario para que la lista de variantes
  // no quede stale con el snapshot de `product` que llegó por props
  // (page.tsx no lo resincroniza cuando se invalida ["products"]).
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const liveProduct = productsQuery.data?.find((p) => p.id === product.id) ?? product;

  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const createMutation = useMutation({
    mutationFn: (payload: { attributes: Record<string, string>; sku: string | null; stock: number }) =>
      createVariant(product.id, payload),
    onSuccess: () => {
      invalidateProducts();
      setAddMode("none");
    },
  });

  const createBulkMutation = useMutation({
    mutationFn: (variants: ProductVariantCreate[]) => createVariantsBulk(product.id, { variants }),
    onSuccess: () => {
      invalidateProducts();
      setAddMode("none");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      variantId: string;
      attributes: Record<string, string>;
      sku: string | null;
      stock: number;
    }) =>
      updateVariant(product.id, vars.variantId, {
        attributes: vars.attributes,
        sku: vars.sku,
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

      {liveProduct.variants.length === 0 && addMode === "none" && (
        <p className="text-sm text-neutral-500">Sin variantes todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {liveProduct.variants.map((variant: ProductVariantRead) =>
          editingVariantId === variant.id ? (
            <li key={variant.id}>
              <VariantAttributesEditor
                initialAttributes={variant.attributes}
                initialSku={variant.sku}
                initialStock={variant.stock}
                isSaving={updateMutation.isPending}
                onSave={(attributes, sku, stock) =>
                  updateMutation.mutate({ variantId: variant.id, attributes, sku, stock })
                }
                onCancel={() => setEditingVariantId(null)}
              />
            </li>
          ) : (
            <li key={variant.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {formatAttributes(variant.attributes)}
                {variant.sku ? ` — SKU: ${variant.sku}` : ""} — stock: {variant.stock}
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

      {addMode === "single" && (
        <VariantAttributesEditor
          initialAttributes={{}}
          initialSku={null}
          initialStock={0}
          isSaving={createMutation.isPending}
          onSave={(attributes, sku, stock) => createMutation.mutate({ attributes, sku, stock })}
          onCancel={() => setAddMode("none")}
        />
      )}

      {addMode === "generate" && (
        <VariantCombinationGenerator
          productSku={liveProduct.sku}
          isSaving={createBulkMutation.isPending}
          onCreate={(variants) => createBulkMutation.mutate(variants)}
          onCancel={() => setAddMode("none")}
        />
      )}

      {addMode === "none" && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setAddMode("single")} className="aura-btn-secondary">
            + Agregar variante
          </button>
          <button type="button" onClick={() => setAddMode("generate")} className="aura-btn-secondary">
            + Generar combinaciones
          </button>
        </div>
      )}

      {(createMutation.isError ||
        updateMutation.isError ||
        deleteMutation.isError ||
        createBulkMutation.isError) && (
        <p role="alert" className="aura-alert">
          {(
            (createMutation.error ??
              updateMutation.error ??
              deleteMutation.error ??
              createBulkMutation.error) as Error
          ).message}
        </p>
      )}
    </div>
  );
}
