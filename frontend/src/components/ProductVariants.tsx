"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Input } from "@/components/ui";
import {
  createAttribute,
  createAttributeValue,
  createVariant,
  createVariantsBulk,
  deleteVariant,
  listAttributes,
  listProducts,
  updateVariant,
} from "@/lib/api/products";
import type {
  ProductAttributeRead,
  ProductRead,
  ProductVariantCreate,
  ProductVariantRead,
} from "@/lib/api/types";

function AttributeChip({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isSelected
          ? "rounded-full bg-accent px-3 py-1 font-body text-xs font-medium text-[#0C1420]"
          : "rounded-full border border-border px-3 py-1 font-body text-xs font-medium text-text-dim hover:bg-surface-2 hover:text-text"
      }
    >
      {label}
    </button>
  );
}

interface AttributeNameSelectorProps {
  attributes: ProductAttributeRead[];
  selectedAttributeId: string | null;
  onSelect: (attributeId: string) => void;
  // Precarga el input de "crear" con este texto -- se usa al editar una
  // variante cuyo nombre de atributo no está (todavía) en el catálogo,
  // para no perder el dato: un click en "OK" lo da de alta tal cual.
  initialCreateName?: string;
}

function AttributeNameSelector({
  attributes,
  selectedAttributeId,
  onSelect,
  initialCreateName,
}: AttributeNameSelectorProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(Boolean(initialCreateName));
  const [newName, setNewName] = useState(initialCreateName ?? "");

  const createMutation = useMutation({
    mutationFn: () => createAttribute({ name: newName.trim() }),
    onSuccess: (attribute) => {
      queryClient.invalidateQueries({ queryKey: ["productAttributes"] });
      onSelect(attribute.id);
      setIsCreating(false);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attributes.map((attribute) => (
        <AttributeChip
          key={attribute.id}
          label={attribute.name}
          isSelected={selectedAttributeId === attribute.id}
          onClick={() => onSelect(attribute.id)}
        />
      ))}
      {isCreating ? (
        <span className="flex items-center gap-1">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej. Color)"
            className="w-32 py-1 text-xs"
          />
          <Button
            type="button"
            variant="primary"
            className="px-2 py-1 text-xs"
            disabled={createMutation.isPending || newName.trim() === ""}
            onClick={() => createMutation.mutate()}
          >
            OK
          </Button>
        </span>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={() => setIsCreating(true)}
        >
          + Nuevo atributo
        </Button>
      )}
      {createMutation.isError && (
        <span className="text-xs text-danger">{(createMutation.error as Error).message}</span>
      )}
    </div>
  );
}

interface AttributeValueChipsProps {
  attribute: ProductAttributeRead;
  isValueSelected: (valueId: string) => boolean;
  onToggleValue: (valueId: string) => void;
  initialCreateValue?: string;
}

function AttributeValueChips({
  attribute,
  isValueSelected,
  onToggleValue,
  initialCreateValue,
}: AttributeValueChipsProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(Boolean(initialCreateValue));
  const [newValue, setNewValue] = useState(initialCreateValue ?? "");

  const createMutation = useMutation({
    mutationFn: () => createAttributeValue(attribute.id, { value: newValue.trim() }),
    onSuccess: (value) => {
      queryClient.invalidateQueries({ queryKey: ["productAttributes"] });
      onToggleValue(value.id);
      setIsCreating(false);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attribute.values.map((value) => (
        <AttributeChip
          key={value.id}
          label={value.value}
          isSelected={isValueSelected(value.id)}
          onClick={() => onToggleValue(value.id)}
        />
      ))}
      {isCreating ? (
        <span className="flex items-center gap-1">
          <Input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Valor (ej. Rojo)"
            className="w-28 py-1 text-xs"
          />
          <Button
            type="button"
            variant="primary"
            className="px-2 py-1 text-xs"
            disabled={createMutation.isPending || newValue.trim() === ""}
            onClick={() => createMutation.mutate()}
          >
            OK
          </Button>
        </span>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={() => setIsCreating(true)}
        >
          + Valor
        </Button>
      )}
      {createMutation.isError && (
        <span className="text-xs text-danger">{(createMutation.error as Error).message}</span>
      )}
    </div>
  );
}

// --- Alta / edición de UNA variante: un valor por atributo ---

interface SingleRowState {
  key: string;
  attributeId: string | null;
  valueId: string | null;
  // Fallback para datos existentes cuyo nombre/valor no matchea ningún
  // atributo del catálogo (ej. variante creada antes de que existiera
  // esta biblioteca) -- así nunca se pierde el dato al editar.
  rawName: string;
  rawValue: string;
}

function newSingleRow(): SingleRowState {
  return { key: crypto.randomUUID(), attributeId: null, valueId: null, rawName: "", rawValue: "" };
}

function resolveSingleRow(
  row: SingleRowState,
  attributes: ProductAttributeRead[]
): { name: string; value: string } {
  const attribute = row.attributeId ? attributes.find((a) => a.id === row.attributeId) : undefined;
  const value = row.valueId ? attribute?.values.find((v) => v.id === row.valueId) : undefined;
  return { name: (attribute?.name ?? row.rawName).trim(), value: value?.value ?? row.rawValue };
}

function rowsToAttributes(
  rows: SingleRowState[],
  attributes: ProductAttributeRead[]
): Record<string, string> {
  return Object.fromEntries(
    rows
      .map((row) => resolveSingleRow(row, attributes))
      .filter((entry) => entry.name !== "")
      .map((entry) => [entry.name, entry.value])
  );
}

function initialSingleRows(
  initialAttributes: Record<string, string>,
  attributes: ProductAttributeRead[]
): SingleRowState[] {
  const entries = Object.entries(initialAttributes);
  if (entries.length === 0) return [newSingleRow()];
  return entries.map(([name, value]) => {
    const attribute = attributes.find((a) => a.name.toLowerCase() === name.toLowerCase());
    const matchedValue = attribute?.values.find((v) => v.value.toLowerCase() === value.toLowerCase());
    return {
      key: crypto.randomUUID(),
      attributeId: attribute?.id ?? null,
      valueId: matchedValue?.id ?? null,
      rawName: name,
      rawValue: value,
    };
  });
}

interface SingleAttributeRowProps {
  row: SingleRowState;
  attributes: ProductAttributeRead[];
  onChange: (row: SingleRowState) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SingleAttributeRow({ row, attributes, onChange, onRemove, canRemove }: SingleAttributeRowProps) {
  const selectedAttribute = attributes.find((a) => a.id === row.attributeId);

  return (
    <div className="flex flex-col gap-2 rounded-base border border-border p-2">
      <div className="flex items-start justify-between gap-2">
        <AttributeNameSelector
          attributes={attributes}
          selectedAttributeId={row.attributeId}
          onSelect={(attributeId) => onChange({ ...row, attributeId, valueId: null, rawName: "" })}
          initialCreateName={row.attributeId ? undefined : row.rawName}
        />
        <Button type="button" variant="secondary" className="shrink-0 px-2" disabled={!canRemove} onClick={onRemove}>
          -
        </Button>
      </div>
      {selectedAttribute && (
        <AttributeValueChips
          attribute={selectedAttribute}
          isValueSelected={(valueId) => row.valueId === valueId}
          onToggleValue={(valueId) => onChange({ ...row, valueId, rawValue: "" })}
          initialCreateValue={row.valueId ? undefined : row.rawValue}
        />
      )}
    </div>
  );
}

interface VariantAttributesEditorProps {
  attributes: ProductAttributeRead[];
  initialAttributes: Record<string, string>;
  initialSku: string | null;
  initialStock: number;
  isSaving: boolean;
  onSave: (attributes: Record<string, string>, sku: string | null, stock: number) => void;
  onCancel: () => void;
}

function VariantAttributesEditor({
  attributes,
  initialAttributes,
  initialSku,
  initialStock,
  isSaving,
  onSave,
  onCancel,
}: VariantAttributesEditorProps) {
  const [rows, setRows] = useState<SingleRowState[]>(() => initialSingleRows(initialAttributes, attributes));
  const [sku, setSku] = useState(initialSku ?? "");
  const [stock, setStock] = useState(String(initialStock));

  return (
    <div className="flex flex-col gap-2 rounded-base border border-border p-3">
      {rows.map((row, index) => (
        <SingleAttributeRow
          key={row.key}
          row={row}
          attributes={attributes}
          onChange={(updated) => setRows(rows.map((r, i) => (i === index ? updated : r)))}
          onRemove={() => setRows(rows.filter((_, i) => i !== index))}
          canRemove={rows.length > 1}
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        className="self-start px-2"
        onClick={() => setRows([...rows, newSingleRow()])}
      >
        + Atributo
      </Button>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        SKU (opcional)
        <Input className="font-mono" value={sku} onChange={(e) => setSku(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Stock
        <Input
          className="font-mono"
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          className="px-3 py-1"
          disabled={isSaving}
          onClick={() =>
            onSave(rowsToAttributes(rows, attributes), sku.trim() === "" ? null : sku.trim(), Number(stock))
          }
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" className="px-3 py-1" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function formatAttributes(attributes: Record<string, string>): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return "(sin atributos)";
  return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
}

// --- Generador de combinaciones: varios valores por atributo ---

interface MultiRowState {
  key: string;
  attributeId: string | null;
  valueIds: string[];
}

function newMultiRow(): MultiRowState {
  return { key: crypto.randomUUID(), attributeId: null, valueIds: [] };
}

interface ParsedAxis {
  name: string;
  values: string[];
}

function resolveMultiRows(rows: MultiRowState[], attributes: ProductAttributeRead[]): ParsedAxis[] {
  return rows
    .map((row) => {
      const attribute = attributes.find((a) => a.id === row.attributeId);
      if (!attribute) return null;
      const values = row.valueIds
        .map((valueId) => attribute.values.find((v) => v.id === valueId)?.value)
        .filter((v): v is string => Boolean(v));
      return { name: attribute.name, values };
    })
    .filter((axis): axis is ParsedAxis => axis !== null && axis.values.length > 0);
}

interface MultiValueAttributeRowProps {
  row: MultiRowState;
  attributes: ProductAttributeRead[];
  onChange: (row: MultiRowState) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function MultiValueAttributeRow({
  row,
  attributes,
  onChange,
  onRemove,
  canRemove,
}: MultiValueAttributeRowProps) {
  const selectedAttribute = attributes.find((a) => a.id === row.attributeId);

  return (
    <div className="flex flex-col gap-2 rounded-base border border-border p-2">
      <div className="flex items-start justify-between gap-2">
        <AttributeNameSelector
          attributes={attributes}
          selectedAttributeId={row.attributeId}
          onSelect={(attributeId) => onChange({ ...row, attributeId, valueIds: [] })}
        />
        <Button type="button" variant="secondary" className="shrink-0 px-2" disabled={!canRemove} onClick={onRemove}>
          -
        </Button>
      </div>
      {selectedAttribute && (
        <AttributeValueChips
          attribute={selectedAttribute}
          isValueSelected={(valueId) => row.valueIds.includes(valueId)}
          onToggleValue={(valueId) =>
            onChange({
              ...row,
              valueIds: row.valueIds.includes(valueId)
                ? row.valueIds.filter((id) => id !== valueId)
                : [...row.valueIds, valueId],
            })
          }
        />
      )}
    </div>
  );
}

interface GeneratedRow {
  attributes: Record<string, string>;
  sku: string;
  stock: string;
}

function cartesianProduct(axes: ParsedAxis[]): Record<string, string>[] {
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
    .replace(/[̀-ͯ]/g, "")
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
  attributes: ProductAttributeRead[];
  productSku: string | null;
  isSaving: boolean;
  onCreate: (variants: ProductVariantCreate[]) => void;
  onCancel: () => void;
}

function VariantCombinationGenerator({
  attributes,
  productSku,
  isSaving,
  onCreate,
  onCancel,
}: VariantCombinationGeneratorProps) {
  const [axisRows, setAxisRows] = useState<MultiRowState[]>([newMultiRow()]);
  const [rows, setRows] = useState<GeneratedRow[] | null>(null);

  const parsedAxes = resolveMultiRows(axisRows, attributes);

  const handleGenerate = () => {
    const combos = cartesianProduct(parsedAxes);
    setRows(
      combos.map((combo) => ({
        attributes: combo,
        sku: buildAutoSku(productSku, combo),
        stock: "0",
      }))
    );
  };

  if (rows === null) {
    return (
      <div className="flex flex-col gap-3 rounded-base border border-border p-3">
        <p className="font-body text-sm text-text-dim">
          Elegí uno o más atributos y tildá sus valores posibles (o agregá uno nuevo al vuelo). Se
          generará una variante por cada combinación.
        </p>
        {axisRows.map((row, index) => (
          <MultiValueAttributeRow
            key={row.key}
            row={row}
            attributes={attributes}
            onChange={(updated) => setAxisRows(axisRows.map((r, i) => (i === index ? updated : r)))}
            onRemove={() => setAxisRows(axisRows.filter((_, i) => i !== index))}
            canRemove={axisRows.length > 1}
          />
        ))}
        <Button
          type="button"
          variant="secondary"
          className="self-start px-2"
          onClick={() => setAxisRows([...axisRows, newMultiRow()])}
        >
          + Atributo
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            className="px-3 py-1"
            disabled={parsedAxes.length === 0}
            onClick={handleGenerate}
          >
            Generar combinaciones
          </Button>
          <Button type="button" variant="secondary" className="px-3 py-1" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const attributeNames = parsedAxes.map((axis) => axis.name);

  return (
    <div className="flex flex-col gap-3 rounded-base border border-border p-3">
      <div className="overflow-x-auto">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="text-left text-text-faint">
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
              <tr key={index} className="border-t border-border">
                {attributeNames.map((name) => (
                  <td key={name} className="px-2 py-1 text-text">
                    {row.attributes[name]}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <Input
                    className="font-mono"
                    value={row.sku}
                    onChange={(e) =>
                      setRows(rows.map((r, i) => (i === index ? { ...r, sku: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    className="w-24 font-mono"
                    type="number"
                    min="0"
                    step="1"
                    value={row.stock}
                    onChange={(e) =>
                      setRows(rows.map((r, i) => (i === index ? { ...r, stock: e.target.value } : r)))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          className="px-3 py-1"
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
        >
          {isSaving ? "Creando..." : `Crear las ${rows.length} variantes`}
        </Button>
        <Button type="button" variant="secondary" className="px-3 py-1" onClick={() => setRows(null)}>
          Volver a los atributos
        </Button>
        <Button type="button" variant="secondary" className="px-3 py-1" onClick={onCancel}>
          Cancelar
        </Button>
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

  const attributesQuery = useQuery({ queryKey: ["productAttributes"], queryFn: listAttributes });
  const attributes = attributesQuery.data ?? [];

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
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="font-display text-sm font-semibold text-text">Variantes</h3>

      {liveProduct.variants.length === 0 && addMode === "none" && (
        <p className="font-body text-sm text-text-dim">Sin variantes todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {liveProduct.variants.map((variant: ProductVariantRead) =>
          editingVariantId === variant.id ? (
            <li key={variant.id}>
              <VariantAttributesEditor
                attributes={attributes}
                initialAttributes={variant.attributes}
                initialSku={variant.sku}
                initialStock={variant.stock}
                isSaving={updateMutation.isPending}
                onSave={(attrs, sku, stock) =>
                  updateMutation.mutate({ variantId: variant.id, attributes: attrs, sku, stock })
                }
                onCancel={() => setEditingVariantId(null)}
              />
            </li>
          ) : (
            <li key={variant.id} className="flex items-center justify-between gap-2 font-body text-sm text-text">
              <span>
                {formatAttributes(variant.attributes)}
                {variant.sku ? ` — SKU: ${variant.sku}` : ""} — stock: {variant.stock}
              </span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2 py-1"
                  onClick={() => setEditingVariantId(variant.id)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2 py-1"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm("¿Borrar esta variante?")) {
                      deleteMutation.mutate(variant.id);
                    }
                  }}
                >
                  Borrar
                </Button>
              </span>
            </li>
          )
        )}
      </ul>

      {addMode === "single" && (
        <VariantAttributesEditor
          attributes={attributes}
          initialAttributes={{}}
          initialSku={null}
          initialStock={0}
          isSaving={createMutation.isPending}
          onSave={(attrs, sku, stock) => createMutation.mutate({ attributes: attrs, sku, stock })}
          onCancel={() => setAddMode("none")}
        />
      )}

      {addMode === "generate" && (
        <VariantCombinationGenerator
          attributes={attributes}
          productSku={liveProduct.sku}
          isSaving={createBulkMutation.isPending}
          onCreate={(variants) => createBulkMutation.mutate(variants)}
          onCancel={() => setAddMode("none")}
        />
      )}

      {addMode === "none" && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddMode("single")}>
            + Agregar variante
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAddMode("generate")}>
            + Generar combinaciones
          </Button>
        </div>
      )}

      {(createMutation.isError ||
        updateMutation.isError ||
        deleteMutation.isError ||
        createBulkMutation.isError) && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
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
