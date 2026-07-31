"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers, listCustomerTypes } from "@/lib/api/customers";
import { listProducts } from "@/lib/api/products";
import { createSale, downloadSaleReceipt } from "@/lib/api/sales";
import type { ProductRead, ProductVariantRead } from "@/lib/api/types";
import { PAYMENT_METHODS, isCardPayment, paymentMethodLabel } from "@/lib/paymentMethods";

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

export function SaleForm() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });
  // Comparte queryKey con CustomerForm -- React Query dedupea.
  const customerTypesQuery = useQuery({ queryKey: ["customerTypes"], queryFn: listCustomerTypes });

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [cardCouponNumber, setCardCouponNumber] = useState("");
  const [cardAuthorizationCode, setCardAuthorizationCode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const filteredProducts = useMemo(() => {
    // Inactivo = dado de baja, no debe ofrecerse para vender (sigue
    // existiendo para historial/edición en la pantalla de Productos).
    const products = (productsQuery.data ?? []).filter((p) => p.is_active);
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [productsQuery.data, productSearch]);

  // El backend decide el precio final igual (ver create_sale) -- esto
  // es solo para que el vendedor vea de entrada qué precio le va a
  // tocar al armar el carrito, antes de confirmar.
  const isWholesaleCustomer = useMemo(() => {
    const customer = customersQuery.data?.find((c) => c.id === customerId);
    if (!customer?.customer_type_id) return false;
    const customerType = customerTypesQuery.data?.find((t) => t.id === customer.customer_type_id);
    return customerType?.is_wholesale ?? false;
  }, [customerId, customersQuery.data, customerTypesQuery.data]);

  function effectivePrice(product: ProductRead): number {
    return isWholesaleCustomer && product.wholesale_price != null ? product.wholesale_price : product.price;
  }

  // Total client-side: solo para mostrarle algo al vendedor mientras
  // arma el carrito. El total real lo calcula el backend a partir del
  // precio que corresponda en el momento del POST -- este número es
  // una estimación, no la fuente de verdad (ver SaleCreate: no lleva
  // unit_price ni total_amount).
  const estimatedTotal = useMemo(
    () => cart.reduce((sum, line) => sum + effectivePrice(line.product) * line.quantity, 0),
    [cart, isWholesaleCustomer],
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
        card_coupon_number: isCardPayment(paymentMethod) ? cardCouponNumber || null : null,
        card_authorization_code: isCardPayment(paymentMethod) ? cardAuthorizationCode || null : null,
      }),
    onSuccess: () => {
      setCart([]);
      setCustomerId("");
      setCardCouponNumber("");
      setCardAuthorizationCode("");
      // el stock mostrado en la lista de productos cambió del lado del
      // servidor (aunque el descuento real lo haga el worker en
      // background de forma asíncrona, current_stock no se mueve acá)
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
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
            <span className="text-xs text-text-faint">cargando clientes...</span>
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
                {paymentMethodLabel(method)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isCardPayment(paymentMethod) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="aura-label">
            Número de cupón (opcional)
            <input
              value={cardCouponNumber}
              onChange={(e) => setCardCouponNumber(e.target.value)}
              className="aura-input"
            />
          </label>
          <label className="aura-label">
            Código de autorización (opcional)
            <input
              value={cardAuthorizationCode}
              onChange={(e) => setCardAuthorizationCode(e.target.value)}
              className="aura-input"
            />
          </label>
        </div>
      )}

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
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span>
                  {product.name} — ${effectivePrice(product).toFixed(2)}
                  {isWholesaleCustomer && product.wholesale_price != null && " (mayorista)"}
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
            <li className="px-3 py-2 text-sm text-text-faint">Sin resultados.</li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3>Carrito</h3>
        {cart.length === 0 && <p className="text-sm text-text-dim">Sin productos agregados.</p>}
        <ul className="flex flex-col divide-y divide-border">
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
                    <span className="text-text-dim">({formatVariantLabel(line.variant)})</span>
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
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-dim">
            Venta N° {String(saleMutation.data.sale_number).padStart(6, "0")} registrada — Total real: $
            {saleMutation.data.total_amount.toFixed(2)}
          </p>
          <button
            type="button"
            disabled={isDownloadingReceipt}
            onClick={async () => {
              setIsDownloadingReceipt(true);
              try {
                await downloadSaleReceipt(saleMutation.data.id);
              } finally {
                setIsDownloadingReceipt(false);
              }
            }}
            className="aura-btn-secondary px-3 py-1"
          >
            {isDownloadingReceipt ? "Generando..." : "Descargar comprobante"}
          </button>
        </div>
      )}
    </div>
  );
}
