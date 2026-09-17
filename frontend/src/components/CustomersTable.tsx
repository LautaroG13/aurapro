"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, DataTable, EmptyState } from "@/components/ui";
import { deleteCustomer, listCustomers, listCustomerTypes } from "@/lib/api/customers";
import type { CustomerRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

interface CustomersTableProps {
  onEdit: (customer: CustomerRead) => void;
  onCreate?: () => void;
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CustomersTable({ onEdit, onCreate }: CustomersTableProps) {
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();
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
            {customersQuery.data?.length === 0 && (
              <DataTable.Row className="hover:bg-transparent">
                <DataTable.Cell colSpan={5} className="border-b-0 p-0">
                  <EmptyState
                    icon={<PersonIcon />}
                    title="Todavía no cargaste ningún cliente"
                    description="Agregá tu primer cliente para empezar a llevar sus datos y su cuenta corriente."
                    action={{ label: "Agregar tu primer cliente", onClick: () => onCreate?.() }}
                  />
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
