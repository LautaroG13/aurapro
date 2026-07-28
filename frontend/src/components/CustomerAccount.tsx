"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, DataTable, Input, Select } from "@/components/ui";
import { createCustomerPayment, getCustomerAccount } from "@/lib/api/treasury";
import type { CustomerRead } from "@/lib/api/types";
import { paymentMethodLabel } from "@/lib/paymentMethods";

const PAYMENT_METHODS = ["cash", "card_debit", "card_credit", "transfer"] as const;

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
      // También invalida la vista general de /accounts, que muestra el
      // mismo saldo resumido por cliente -- si no, queda desactualizada
      // hasta el próximo refetch natural.
      queryClient.invalidateQueries({ queryKey: ["customerAccounts"] });
      setAmount("");
      setDescription("");
    },
  });

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="font-display text-sm font-semibold text-text">Cuenta corriente</h3>

      {accountQuery.isLoading && <p className="font-body text-sm text-text-dim">Cargando...</p>}
      {accountQuery.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(accountQuery.error as Error).message}
        </p>
      )}

      {accountQuery.data && (
        <>
          <p className="font-body text-sm text-text">
            Saldo:{" "}
            <strong className={accountQuery.data.balance > 0 ? "font-mono text-danger" : "font-mono text-success"}>
              ${accountQuery.data.balance.toFixed(2)}
            </strong>
            {customer.credit_limit != null && (
              <span className="text-text-dim"> — límite: ${customer.credit_limit.toFixed(2)}</span>
            )}
          </p>

          <div className="overflow-x-auto">
            <DataTable.Root>
              <DataTable.Head>
                <DataTable.Row className="hover:bg-transparent">
                  <DataTable.HeaderCell>Fecha</DataTable.HeaderCell>
                  <DataTable.HeaderCell>Tipo</DataTable.HeaderCell>
                  <DataTable.HeaderCell align="right">Monto</DataTable.HeaderCell>
                  <DataTable.HeaderCell>Descripción</DataTable.HeaderCell>
                </DataTable.Row>
              </DataTable.Head>
              <DataTable.Body>
                {accountQuery.data.movements.map((movement) => (
                  <DataTable.Row key={movement.id}>
                    <DataTable.Cell className="text-text-dim">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </DataTable.Cell>
                    <DataTable.Cell>{movement.type === "DEBIT" ? "Debe" : "Haber"}</DataTable.Cell>
                    <DataTable.Cell numeric>${movement.amount.toFixed(2)}</DataTable.Cell>
                    <DataTable.Cell className="text-text-dim">{movement.description ?? "—"}</DataTable.Cell>
                  </DataTable.Row>
                ))}
                {accountQuery.data.movements.length === 0 && (
                  <DataTable.Row>
                    <DataTable.Cell className="text-center text-text-faint" colSpan={4}>
                      Sin movimientos todavía.
                    </DataTable.Cell>
                  </DataTable.Row>
                )}
              </DataTable.Body>
            </DataTable.Root>
          </div>
        </>
      )}

      {/* div, no <form>: este bloque vive adentro del <form> de
          CustomerForm -- un <form> anidado es HTML inválido y puede
          disparar el submit equivocado. Mismo patrón que
          ProductVariants (botones type="button" + onClick). */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
          Registrar cobro
          <Input
            className="w-32 font-mono"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
          Medio
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabel(method)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
          Descripción (opcional)
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <Button
          type="button"
          variant="primary"
          className="px-3 py-2"
          disabled={paymentMutation.isPending || amount === ""}
          onClick={() => paymentMutation.mutate()}
        >
          {paymentMutation.isPending ? "Guardando..." : "Registrar"}
        </Button>
      </div>

      {paymentMutation.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(paymentMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
