"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, DataTable } from "@/components/ui";
import { deleteCustomer, listCustomers, listCustomerTypes } from "@/lib/api/customers";
import type { CustomerRead } from "@/lib/api/types";

interface CustomersTableProps {
  onEdit: (customer: CustomerRead) => void;
}

export function CustomersTable({ onEdit }: CustomersTableProps) {
  const queryClient = useQueryClient();
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  // Comparte queryKey con CustomerForm -- React Query dedupea, no
  // dispara un fetch extra. Se usa acá solo para resolver
  // customer_type_id -> nombre en la columna "Tipo".
  const customerTypesQuery = useQuery({ queryKey: ["customerTypes"], queryFn: listCustomerTypes });

  const typeNameById = new Map(customerTypesQuery.data?.map((t) => [t.id, t.name]));

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  if (customersQuery.isLoading) {
    return (
      <Card className="p-5">
        <p className="font-body text-sm text-text-dim">Cargando clientes...</p>
      </Card>
    );
  }

  if (customersQuery.isError) {
    return (
      <Card className="p-5">
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(customersQuery.error as Error).message}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="font-display text-[14.5px] font-semibold text-text">Clientes</h2>
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
            {customersQuery.data?.map((customer) => (
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
                </DataTable.Cell>
              </DataTable.Row>
            ))}
            {customersQuery.data?.length === 0 && (
              <DataTable.Row>
                <DataTable.Cell className="text-center text-text-faint" colSpan={5}>
                  Sin clientes todavía.
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
