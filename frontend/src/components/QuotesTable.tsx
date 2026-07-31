"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers } from "@/lib/api/customers";
import { downloadQuoteReceipt, listQuotes, updateQuoteStatus } from "@/lib/api/quotes";
import type { QuoteStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
};

export function QuotesTable() {
  const queryClient = useQueryClient();
  const quotesQuery = useQuery({ queryKey: ["quotes"], queryFn: listQuotes });
  // Comparte queryKey con QuoteForm/CustomersTable -- React Query dedupea.
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const customerNameById = new Map(customersQuery.data?.map((c) => [c.id, c.name]));

  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ quoteId, status }: { quoteId: string; status: QuoteStatus }) =>
      updateQuoteStatus(quoteId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
  });

  if (quotesQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-text-dim">Cargando presupuestos...</p>
      </div>
    );
  }

  if (quotesQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(quotesQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Presupuestos</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Válido hasta</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotesQuery.data?.map((quote) => (
              <tr key={quote.id}>
                <td>{String(quote.quote_number).padStart(6, "0")}</td>
                <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                <td>{customerNameById.get(quote.customer_id) ?? "—"}</td>
                <td>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "—"}</td>
                <td>${quote.total_amount.toFixed(2)}</td>
                <td>{STATUS_LABELS[quote.status]}</td>
                <td className="flex flex-wrap gap-2">
                  {quote.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ quoteId: quote.id, status: "ACCEPTED" })}
                        className="aura-btn-secondary px-2 py-1"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ quoteId: quote.id, status: "REJECTED" })}
                        className="aura-btn-danger px-2 py-1"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={downloadingQuoteId === quote.id}
                    onClick={async () => {
                      setDownloadingQuoteId(quote.id);
                      try {
                        await downloadQuoteReceipt(quote.id);
                      } finally {
                        setDownloadingQuoteId(null);
                      }
                    }}
                    className="aura-btn-secondary px-2 py-1"
                  >
                    {downloadingQuoteId === quote.id ? "Generando..." : "PDF"}
                  </button>
                </td>
              </tr>
            ))}
            {quotesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-text-faint">
                  Sin presupuestos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {statusMutation.isError && (
        <p role="alert" className="aura-alert">
          {(statusMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
