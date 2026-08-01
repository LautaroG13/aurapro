"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers, listCustomerTypes } from "@/lib/api/customers";
import { createOrderNote, downloadOrderNoteReceipt } from "@/lib/api/orderNotes";
import { listProducts } from "@/lib/api/products";
import type { ProductRead, ProductVariantRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

interface CartLine {
  product: ProductRead;
  variant: ProductVariantRead | null;
  quantity: number;
}

function lineKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

function formatVariantLabel(variant: ProductVariantRead): string {
  return Object.values(variant.attributes).join(" / ") || variant.sku || "Variante";
}

export function OrderNoteForm() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const customerTypesQuery = useQuery({ queryKey: ["customerTypes"], queryFn: listCustomerTypes });

  const [customerId, setCustomerId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const filteredProducts = useMemo(() => {
    const products = (productsQuery.data ?? []).filter((p) => p.is_active);
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [productsQuery.data, productSearch]);

  const isWholesaleCustomer = useMemo(() => {
    const customer = customersQuery.data?.find((c) => c.id === customerId);
    if (!customer?.customer_type_id) return false;
    const customerType = customerTypesQuery.data?.find((t) => t.id === customer.customer_type_id);
    return customerType?.is_wholesale ?? false;
  }, [customerId, customersQuery.data, customerTypesQuery.data]);

  function effectivePrice(product: ProductRead): number {
    return isWholesaleCustomer && product.wholesale_price != null ? product.wholesale_price : product.price;
  }

  const estimatedTotal = useMemo(
    () => cart.reduce((sum, line) => sum + effectivePrice(line.product) * line.quantity, 0),
    [cart, isWholesaleCustomer],
  );

  function addToCart(product: ProductRead, variant: ProductVariantRead | null) {
    const key = lineKey(product.id, variant?.id ?? null);
    setCart((prev) => {
      const existing = prev.find((line) => lineKey(line.product.id, line.variant?.id ?? null) === key);
      if (existing) {
        return prev.map((line) =>
          lineKey(line.product.id, line.variant?.id ?? null) === key
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  }

  // min={1} en el input es solo un hint de HTML -- sin este clamp se
  // puede mandar quantity 0 al backend (el campo vacío mientras se
  // reescribe da Number("") === 0), que lo rechaza con 422.
  function updateQuantity(productId: string, variantId: string | null, quantity: number) {
    const key = lineKey(productId, variantId);
    const clamped = Math.max(1, Math.trunc(quantity) || 1);
    setCart((prev) =>
      prev.map((line) =>
        lineKey(line.product.id, line.variant?.id ?? null) === key ? { ...line, quantity: clamped } : line,
      ),
    );
  }

  function removeFromCart(productId: string, variantId: string | null) {
    const key = lineKey(productId, variantId);
    setCart((prev) => prev.filter((line) => lineKey(line.product.id, line.variant?.id ?? null) !== key));
  }

  const orderNoteMutation = useMutation({
    mutationFn: () =>
      createOrderNote({
        customer_id: customerId,
        items: cart.map((line) => ({
          product_id: line.product.id,
          variant_id: line.variant?.id ?? null,
          quantity: line.quantity,
        })),
      }),
    onSuccess: () => {
      setCart([]);
      setCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["orderNotes"] });
    },
  });

  const canWrite = useCanWrite();
  const canSubmit = canWrite && customerId !== "" && cart.length > 0 && !orderNoteMutation.isPending;

  return (
    <div className="aura-card flex flex-col gap-5">
      <h2>Nueva nota de pedido</h2>

      <label className="aura-label">
        Cliente
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="aura-select">
          <option value="">Seleccioná un cliente...</option>
          {customersQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="aura-input"
        />
        {productsQuery.isLoading && <p className="text-sm text-text-dim">Cargando productos...</p>}
        <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
          {filteredProducts.map((product) => {
            const hasVariants = product.variants.length > 0;
            const selectedVariantId = selectedVariantByProduct[product.id] ?? "";
            const selectedVariant = hasVariants
              ? (product.variants.find((v) => v.id === selectedVariantId) ?? null)
              : null;
            return (
              <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  {product.name} — ${effectivePrice(product).toFixed(2)}
                  {isWholesaleCustomer && product.wholesale_price != null && " (mayorista)"}
                </span>
                <span className="flex items-center gap-2">
                  {hasVariants && (
                    <select
                      value={selectedVariantId}
                      onChange={(e) =>
                        setSelectedVariantByProduct((prev) => ({ ...prev, [product.id]: e.target.value }))
                      }
                      className="aura-select"
                    >
                      <option value="">Elegí variante...</option>
                      {product.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {formatVariantLabel(variant)}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => addToCart(product, selectedVariant)}
                    disabled={hasVariants && !selectedVariant}
                    className="aura-btn-secondary px-3 py-1"
                  >
                    Agregar
                  </button>
                </span>
              </li>
            );
          })}
          {productsQuery.data && filteredProducts.length === 0 && (
            <li className="px-3 py-2 text-sm text-text-faint">Sin resultados.</li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3>Ítems de la nota</h3>
        {cart.length === 0 && <p className="text-sm text-text-dim">Sin productos agregados.</p>}
        <ul className="flex flex-col divide-y divide-border">
          {cart.map((line) => (
            <li
              key={lineKey(line.product.id, line.variant?.id ?? null)}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {line.product.name}
                {line.variant && <span className="text-text-dim">({formatVariantLabel(line.variant)})</span>}
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateQuantity(line.product.id, line.variant?.id ?? null, Number(e.target.value))
                  }
                  className="aura-input w-16 px-2 py-1"
                />
                x ${effectivePrice(line.product).toFixed(2)} = $
                {(effectivePrice(line.product) * line.quantity).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => removeFromCart(line.product.id, line.variant?.id ?? null)}
                className="aura-btn-danger px-3 py-1"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <p className="text-right">
          <strong>Total estimado: ${estimatedTotal.toFixed(2)}</strong>
        </p>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => orderNoteMutation.mutate()}
        className="aura-btn-primary self-end"
      >
        {orderNoteMutation.isPending ? "Generando..." : "Generar nota de pedido"}
      </button>

      {orderNoteMutation.isError && (
        <p role="alert" className="aura-alert">
          {(orderNoteMutation.error as Error).message}
        </p>
      )}
      {orderNoteMutation.isSuccess && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-dim">
            Nota de pedido N° {String(orderNoteMutation.data.order_note_number).padStart(6, "0")} generada —
            Total: ${orderNoteMutation.data.total_amount.toFixed(2)}
          </p>
          <button
            type="button"
            disabled={isDownloadingReceipt}
            onClick={async () => {
              setIsDownloadingReceipt(true);
              try {
                await downloadOrderNoteReceipt(orderNoteMutation.data.id);
              } finally {
                setIsDownloadingReceipt(false);
              }
            }}
            className="aura-btn-secondary px-3 py-1"
          >
            {isDownloadingReceipt ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
