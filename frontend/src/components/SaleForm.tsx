"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers } from "@/lib/api/customers";
import { listProducts } from "@/lib/api/products";
import { createSale } from "@/lib/api/sales";
import type { ProductRead } from "@/lib/api/types";

interface CartLine {
  product: ProductRead;
  quantity: number;
}

const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;

export function SaleForm() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

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

  function addToCart(product: ProductRead) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, product.current_stock);
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, quantity: nextQuantity } : line,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev.map((line) => (line.product.id === productId ? { ...line, quantity } : line)),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  const saleMutation = useMutation({
    mutationFn: () =>
      createSale({
        customer_id: customerId,
        payment_method: paymentMethod,
        items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
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
    <div>
      <h2>Nueva venta</h2>

      <div>
        <label>
          Cliente
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Seleccioná un cliente...</option>
            {customersQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {customersQuery.isLoading && <span> cargando clientes...</span>}
      </div>

      <div>
        <label>
          Medio de pago
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <input
          type="text"
          placeholder="Buscar producto por nombre..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
        {productsQuery.isLoading && <p>Cargando productos...</p>}
        <ul>
          {filteredProducts.map((product) => (
            <li key={product.id}>
              {product.name} — ${product.price.toFixed(2)} (stock: {product.current_stock}){" "}
              <button
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.current_stock <= 0}
              >
                Agregar
              </button>
            </li>
          ))}
          {productsQuery.data && filteredProducts.length === 0 && <li>Sin resultados.</li>}
        </ul>
      </div>

      <div>
        <h3>Carrito</h3>
        {cart.length === 0 && <p>Sin productos agregados.</p>}
        <ul>
          {cart.map((line) => (
            <li key={line.product.id}>
              {line.product.name} —{" "}
              <input
                type="number"
                min={1}
                max={line.product.current_stock}
                value={line.quantity}
                onChange={(e) => updateQuantity(line.product.id, Number(e.target.value))}
                style={{ width: 60 }}
              />{" "}
              x ${line.product.price.toFixed(2)} = $
              {(line.product.price * line.quantity).toFixed(2)}{" "}
              <button type="button" onClick={() => removeFromCart(line.product.id)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <p>
          <strong>Total estimado: ${estimatedTotal.toFixed(2)}</strong>
        </p>
      </div>

      <button type="button" disabled={!canSubmit} onClick={() => saleMutation.mutate()}>
        {saleMutation.isPending ? "Registrando..." : "Confirmar venta"}
      </button>

      {saleMutation.isError && <p role="alert">{(saleMutation.error as Error).message}</p>}
      {saleMutation.isSuccess && (
        <p>
          Venta registrada ({saleMutation.data.id}) — Total real: $
          {saleMutation.data.total_amount.toFixed(2)} {saleMutation.data.currency}
        </p>
      )}
    </div>
  );
}
