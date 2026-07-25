"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createCustomerPayment, getCustomerAccount } from "@/lib/api/treasury";
import type { CustomerRead } from "@/lib/api/types";

const PAYMENT_METHODS = ["cash", "card", "transfer"] as const;

interface CustomerAccountProps {
  customer: CustomerRead;
}

export function CustomerAccount({ customer }: CustomerAccountProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [description, setDescription] = useState("");

  const accountQuery = useQuery({
    queryKey: ["customerAccount", customer.id],
    queryFn: () => getCustomerAccount(customer.id),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      createCustomerPayment(customer.id, {
        amount: Number(amount),
        payment_method: paymentMethod,
        description: description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAccount", customer.id] });
      setAmount("");
      setDescription("");
    },
  });

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
      <h3>Cuenta corriente</h3>

      {accountQuery.isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}
      {accountQuery.isError && (
        <p role="alert" className="aura-alert">
          {(accountQuery.error as Error).message}
        </p>
      )}

      {accountQuery.data && (
        <>
          <p className="text-sm">
            Saldo:{" "}
            <strong className={accountQuery.data.balance > 0 ? "text-red-600" : "text-green-600"}>
              ${accountQuery.data.balance.toFixed(2)}
            </strong>
            {customer.credit_limit != null && (
              <span className="text-neutral-500"> — límite: ${customer.credit_limit.toFixed(2)}</span>
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="aura-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {accountQuery.data.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.created_at).toLocaleDateString()}</td>
                    <td>{movement.type === "DEBIT" ? "Debe" : "Haber"}</td>
                    <td>${movement.amount.toFixed(2)}</td>
                    <td>{movement.description ?? "—"}</td>
                  </tr>
                ))}
                {accountQuery.data.movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-neutral-400">
                      Sin movimientos todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* div, no <form>: este bloque vive adentro del <form> de
          CustomerForm -- un <form> anidado es HTML inválido y puede
          disparar el submit equivocado. Mismo patrón que
          ProductVariants (botones type="button" + onClick). */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="aura-label">
          Registrar cobro
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="aura-input w-32"
          />
        </label>
        <label className="aura-label">
          Medio
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="aura-input"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className="aura-label">
          Descripción (opcional)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="aura-input"
          />
        </label>
        <button
          type="button"
          onClick={() => paymentMutation.mutate()}
          disabled={paymentMutation.isPending || amount === ""}
          className="aura-btn-primary px-3 py-2"
        >
          {paymentMutation.isPending ? "Guardando..." : "Registrar"}
        </button>
      </div>

      {paymentMutation.isError && (
        <p role="alert" className="aura-alert">
          {(paymentMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
