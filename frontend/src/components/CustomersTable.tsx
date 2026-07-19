"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
      <div className="aura-card">
        <p className="text-sm text-neutral-500">Cargando clientes...</p>
      </div>
    );
  }

  if (customersQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(customersQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Clientes</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customersQuery.data?.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email ?? "—"}</td>
                <td>{customer.phone ?? "—"}</td>
                <td>
                  {customer.customer_type_id
                    ? (typeNameById.get(customer.customer_type_id) ?? "—")
                    : "—"}
                </td>
                <td className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(customer)}
                    className="aura-btn-secondary px-3 py-1"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Borrar "${customer.name}"?`)) {
                        deleteMutation.mutate(customer.id);
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
            {customersQuery.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-neutral-400">
                  Sin clientes todavía.
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
