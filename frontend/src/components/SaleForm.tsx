"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers } from "@/lib/api/customers";
import { listProducts } from "@/lib/api/products";
import { createSale } from "@/lib/api/sales";
import type { ProductRead, ProductVariantRead } from "@/lib/api/types";

interface CartLine {
  product: ProductRead;
  variant: ProductVariantRead | null;
  quantity: number;
}

const PAYMENT_METHODS = ["cash", "card", "transfer", "account"] as const;

function lineKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

function formatVariantLabel(variant: ProductVariantRead): string {
  return Object.values(variant.attributes).join(" / ") || variant.sku || "Variante";
}

export function SaleForm() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});

  const filteredProducts = useMemo(() => {
    const products = productsQuery.data ?? [];
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [productsQuery.data, productSearch]);

  // Total client-side: solo para mostrarle algo al vendedor mientras
  // arma el carrito. El total real lo calcula el backend a partir de
  // Product.price en el momento del POST -- este número es una
  // estimación, no la fuente de verdad (ver SaleCreate: no lleva
  // unit_price ni total_amount).
  const estimatedTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cart],
  );

  function addToCart(product: ProductRead, variant: ProductVariantRead | null) {
    const key = lineKey(product.id, variant?.id ?? null);
    const maxStock = variant ? variant.stock : product.current_stock;
    setCart((prev) => {
      const existing = prev.find((line) => lineKey(line.product.id, line.variant?.id ?? null) === key);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, maxStock);
        return prev.map((line) =>
          lineKey(line.product.id, line.variant?.id ?? null) === key ? { ...line, quantity: nextQuantity } : line,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, variantId: string | null, quantity: number) {
    const key = lineKey(productId, variantId);
    setCart((prev) =>
      prev.map((line) =>
        lineKey(line.product.id, line.variant?.id ?? null) === key ? { ...line, quantity } : line,
      ),
    );
  }

  function removeFromCart(productId: string, variantId: string | null) {
    const key = lineKey(productId, variantId);
    setCart((prev) => prev.filter((line) => lineKey(line.product.id, line.variant?.id ?? null) !== key));
  }

  const saleMutation = useMutation({
    mutationFn: () =>
      createSale({
        customer_id: customerId,
        payment_method: paymentMethod,
        items: cart.map((line) => ({
          product_id: line.product.id,
          variant_id: line.variant?.id ?? null,
          quantity: line.quantity,
        })),
      }),
    onSuccess: () => {
      setCart([]);
      setCustomerId("");
      // el stock mostrado en la lista de productos cambió del lado del
      // servidor (aunque el descuento real lo haga el worker en
      // background de forma asíncrona, current_stock no se mueve acá)
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const canSubmit = customerId !== "" && cart.length > 0 && !saleMutation.isPending;

  return (
    <div className="aura-card flex flex-col gap-5">
      <h2>Nueva venta</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="aura-label">
          Cliente
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="aura-select"
          >
            <option value="">Seleccioná un cliente...</option>
            {customersQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {customersQuery.isLoading && (
            <span className="text-xs text-neutral-400">cargando clientes...</span>
          )}
        </label>

        <label className="aura-label">
          Medio de pago
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="aura-select"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="aura-input"
        />
        {productsQuery.isLoading && <p className="text-sm text-neutral-500">Cargando productos...</p>}
        <ul className="flex max-h-56 flex-col divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {filteredProducts.map((product) => {
            const hasVariants = product.variants.length > 0;
            const selectedVariantId = selectedVariantByProduct[product.id] ?? "";
            const selectedVariant = hasVariants
              ? (product.variants.find((v) => v.id === selectedVariantId) ?? null)
              : null;
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span>
                  {product.name} — ${product.price.toFixed(2)}
                  {!hasVariants && ` (stock: ${product.current_stock})`}
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
                          {formatVariantLabel(variant)} (stock: {variant.stock})
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => addToCart(product, selectedVariant)}
                    disabled={hasVariants ? !selectedVariant || selectedVariant.stock <= 0 : product.current_stock <= 0}
                    className="aura-btn-secondary px-3 py-1"
                  >
                    Agregar
                  </button>
                </span>
              </li>
            );
          })}
          {productsQuery.data && filteredProducts.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-400">Sin resultados.</li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3>Carrito</h3>
        {cart.length === 0 && <p className="text-sm text-neutral-500">Sin productos agregados.</p>}
        <ul className="flex flex-col divide-y divide-neutral-100">
          {cart.map((line) => {
            const maxStock = line.variant ? line.variant.stock : line.product.current_stock;
            return (
              <li
                key={lineKey(line.product.id, line.variant?.id ?? null)}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  {line.product.name}
                  {line.variant && (
                    <span className="text-neutral-500">({formatVariantLabel(line.variant)})</span>
                  )}
                  <input
                    type="number"
                    min={1}
                    max={maxStock}
                    value={line.quantity}
                    onChange={(e) =>
                      updateQuantity(line.product.id, line.variant?.id ?? null, Number(e.target.value))
                    }
                    className="aura-input w-16 px-2 py-1"
                  />
                  x ${line.product.price.toFixed(2)} = $
                  {(line.product.price * line.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCart(line.product.id, line.variant?.id ?? null)}
                  className="aura-btn-danger px-3 py-1"
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-right">
          <strong>Total estimado: ${estimatedTotal.toFixed(2)}</strong>
        </p>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => saleMutation.mutate()}
        className="aura-btn-primary self-end"
      >
        {saleMutation.isPending ? "Registrando..." : "Confirmar venta"}
      </button>

      {saleMutation.isError && (
        <p role="alert" className="aura-alert">
          {(saleMutation.error as Error).message}
        </p>
      )}
      {saleMutation.isSuccess && (
        <p className="text-sm text-neutral-600">
          Venta registrada ({saleMutation.data.id}) — Total real: $
          {saleMutation.data.total_amount.toFixed(2)} {saleMutation.data.currency}
        </p>
      )}
    </div>
  );
}
