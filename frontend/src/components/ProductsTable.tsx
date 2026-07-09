"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteProduct, listProducts } from "@/lib/api/products";
import type { ProductRead } from "@/lib/api/types";

interface ProductsTableProps {
  onEdit: (product: ProductRead) => void;
}

export function ProductsTable({ onEdit }: ProductsTableProps) {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  if (productsQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-neutral-500">Cargando productos...</p>
      </div>
    );
  }

  if (productsQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(productsQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Productos</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productsQuery.data?.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.sku ?? "—"}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>{product.current_stock}</td>
                <td className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="aura-btn-secondary px-3 py-1"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Borrar "${product.name}"?`)) {
                        deleteMutation.mutate(product.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="aura-btn-danger px-3 py-1"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {productsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-neutral-400">
                  Sin productos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {deleteMutation.isError && (
        <p role="alert" className="aura-alert">
          {(deleteMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
