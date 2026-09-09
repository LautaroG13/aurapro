"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button, Card, DataTable, Input } from "@/components/ui";
import { deleteCustomer, listCustomers, listCustomerTypes } from "@/lib/api/customers";
import type { CustomerRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

interface CustomersTableProps {
  onEdit: (customer: CustomerRead) => void;
}

export function CustomersTable({ onEdit }: CustomersTableProps) {
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);

  // Debounce: sin esto, cada tecla tipeada dispara un fetch. Al cambiar
  // la búsqueda efectiva, vuelve a la primera página -- si no, se puede
  // quedar en un `skip` que ya no tiene resultados para el nuevo filtro.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setSkip(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const customersQuery = useQuery({
    queryKey: ["customers", { skip, search }],
    queryFn: () => listCustomers({ skip, limit: PAGE_SIZE, search: search || undefined }),
    // Sin esto, cambiar de página o tipear en el buscador reemplaza toda
    // la tabla por "Cargando..." en cada fetch -- con placeholderData
    // se sigue viendo la página anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });
  const customers = customersQuery.data ?? [];
  const hasNextPage = customers.length === PAGE_SIZE;

  // Comparte queryKey con CustomerForm -- React Query dedupea, no
  // dispara un fetch extra. Se usa acá solo para resolver
  // customer_type_id -> nombre en la columna "Tipo".
  const customerTypesQuery = useQuery({ queryKey: ["customerTypes"], queryFn: listCustomerTypes });

  const typeNameById = new Map(customerTypesQuery.data?.map((t) => [t.id, t.name]));

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[14.5px] font-semibold text-text">Clientes</h2>
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="max-w-xs"
        />
      </div>

      {customersQuery.isLoading ? (
        <p className="font-body text-sm text-text-dim">Cargando clientes...</p>
      ) : customersQuery.isError ? (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(customersQuery.error as Error).message}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <DataTable.Root>
            <DataTable.Head>
              <DataTable.Row className="hover:bg-transparent">
                <DataTable.HeaderCell>Nombre</DataTable.HeaderCell>
                <DataTable.HeaderCell>Email</DataTable.HeaderCell>
                <DataTable.HeaderCell>Teléfono</DataTable.HeaderCell>
                <DataTable.HeaderCell>Tipo</DataTable.HeaderCell>
                <DataTable.HeaderCell></DataTable.HeaderCell>
              </DataTable.Row>
            </DataTable.Head>
            <DataTable.Body>
              {customers.map((customer) => (
                <DataTable.Row key={customer.id}>
                  <DataTable.Cell>{customer.name}</DataTable.Cell>
                  <DataTable.Cell className="text-text-dim">{customer.email ?? "—"}</DataTable.Cell>
                  <DataTable.Cell className="text-text-dim">{customer.phone ?? "—"}</DataTable.Cell>
                  <DataTable.Cell>
                    {customer.customer_type_id
                      ? (typeNameById.get(customer.customer_type_id) ?? "—")
                      : "—"}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {canWrite && (
                      <div className="flex gap-2">
                        <Button variant="secondary" className="px-2.5 py-1" onClick={() => onEdit(customer)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2.5 py-1"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`¿Borrar "${customer.name}"?`)) {
                              deleteMutation.mutate(customer.id);
                            }
                          }}
                        >
                          Borrar
                        </Button>
                      </div>
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
              {customers.length === 0 && (
                <DataTable.Row>
                  <DataTable.Cell className="text-center text-text-faint" colSpan={5}>
                    {search ? "Ningún cliente coincide con la búsqueda." : "Sin clientes todavía."}
                  </DataTable.Cell>
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        </div>
      )}

      {(skip > 0 || hasNextPage) && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="px-3 py-1"
            disabled={skip === 0}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
          >
            Anterior
          </Button>
          <span className="font-body text-xs text-text-dim">
            {skip + 1}–{skip + customers.length}
          </span>
          <Button
            variant="secondary"
            className="px-3 py-1"
            disabled={!hasNextPage}
            onClick={() => setSkip((s) => s + PAGE_SIZE)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {deleteMutation.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(deleteMutation.error as Error).message}
        </p>
      )}
    </Card>
  );
}
