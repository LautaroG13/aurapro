"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, DataTable, StatusDot } from "@/components/ui";
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
      <Card className="p-5">
        <p className="font-body text-sm text-text-dim">Cargando productos...</p>
      </Card>
    );
  }

  if (productsQuery.isError) {
    return (
      <Card className="p-5">
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(productsQuery.error as Error).message}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="font-display text-[14.5px] font-semibold text-text">Productos</h2>
      <div className="overflow-x-auto">
        <DataTable.Root>
          <DataTable.Head>
            <DataTable.Row className="hover:bg-transparent">
              <DataTable.HeaderCell>Nombre</DataTable.HeaderCell>
              <DataTable.HeaderCell>SKU</DataTable.HeaderCell>
              <DataTable.HeaderCell align="right">Precio</DataTable.HeaderCell>
              <DataTable.HeaderCell align="right">P. mayorista</DataTable.HeaderCell>
              <DataTable.HeaderCell align="right">Stock</DataTable.HeaderCell>
              <DataTable.HeaderCell>Estado</DataTable.HeaderCell>
              <DataTable.HeaderCell></DataTable.HeaderCell>
            </DataTable.Row>
          </DataTable.Head>
          <DataTable.Body>
            {productsQuery.data?.map((product) => (
              <DataTable.Row key={product.id}>
                <DataTable.Cell className={product.is_active ? "" : "text-text-faint"}>
                  {product.name}
                </DataTable.Cell>
                <DataTable.Cell className="font-mono text-[12.5px] text-text-dim">
                  {product.sku ?? "—"}
                </DataTable.Cell>
                <DataTable.Cell numeric>${product.price.toFixed(2)}</DataTable.Cell>
                <DataTable.Cell numeric className="text-text-dim">
                  {product.wholesale_price != null ? `$${product.wholesale_price.toFixed(2)}` : "—"}
                </DataTable.Cell>
                <DataTable.Cell numeric>{product.current_stock}</DataTable.Cell>
                <DataTable.Cell>
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={product.current_stock > 0 ? "ok" : "out"} />
                    {product.is_active ? "Activo" : "Inactivo"}
                  </span>
                </DataTable.Cell>
                <DataTable.Cell>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="px-2.5 py-1" onClick={() => onEdit(product)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2.5 py-1"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`¿Borrar "${product.name}"?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                    >
                      Borrar
                    </Button>
                  </div>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
            {productsQuery.data?.length === 0 && (
              <DataTable.Row>
                <DataTable.Cell className="text-center text-text-faint" colSpan={7}>
                  Sin productos todavía.
                </DataTable.Cell>
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      </div>
      {deleteMutation.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(deleteMutation.error as Error).message}
        </p>
      )}
    </Card>
  );
}
