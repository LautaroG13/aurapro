"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CustomerAccount } from "@/components/CustomerAccount";
import { listCustomers } from "@/lib/api/customers";
import { listCustomerAccounts } from "@/lib/api/treasury";

export function CustomerAccountsTable() {
  const accountsQuery = useQuery({ queryKey: ["customerAccounts"], queryFn: listCustomerAccounts });
  // Comparte queryKey con CustomersTable/CustomerForm -- React Query
  // dedupea. Se necesita el CustomerRead completo (no solo lo que
  // devuelve /customer-accounts) para reusar <CustomerAccount> tal
  // cual, sin duplicar esa UI.
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  if (accountsQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-text-dim">Cargando...</p>
      </div>
    );
  }

  if (accountsQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(accountsQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Cuenta corriente</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Saldo</th>
              <th>Límite de crédito</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accountsQuery.data?.map((account) => {
              const fullCustomer = customersQuery.data?.find((c) => c.id === account.customer_id);
              const isExpanded = expandedCustomerId === account.customer_id;
              return (
                <tr key={account.customer_id}>
                  <td colSpan={4} className="p-0">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>{account.customer_name}</span>
                      <span className={account.balance > 0 ? "font-mono text-danger" : "font-mono text-success"}>
                        ${account.balance.toFixed(2)}
                      </span>
                      <span className="text-text-dim">
                        {account.credit_limit != null ? `$${account.credit_limit.toFixed(2)}` : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedCustomerId(isExpanded ? null : account.customer_id)}
                        disabled={!fullCustomer}
                        className="aura-btn-secondary px-3 py-1"
                      >
                        {isExpanded ? "Ocultar" : "Ver detalle"}
                      </button>
                    </div>
                    {isExpanded && fullCustomer && (
                      <div className="px-3 pb-3">
                        <CustomerAccount customer={fullCustomer} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {accountsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-text-faint">
                  Sin clientes todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
