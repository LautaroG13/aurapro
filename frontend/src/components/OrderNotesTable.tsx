"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustomers } from "@/lib/api/customers";
import { downloadOrderNoteReceipt, listOrderNotes, updateOrderNoteStatus } from "@/lib/api/orderNotes";
import { listSales } from "@/lib/api/sales";
import type { OrderNoteStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<OrderNoteStatus, string> = {
  PENDING: "Pendiente",
  INVOICED: "Facturada",
  CANCELLED: "Cancelada",
};

export function OrderNotesTable() {
  const queryClient = useQueryClient();
  const orderNotesQuery = useQuery({ queryKey: ["orderNotes"], queryFn: listOrderNotes });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  // Para resolver sale_id -> sale_number en las notas ya facturadas.
  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: listSales });
  const customerNameById = new Map(customersQuery.data?.map((c) => [c.id, c.name]));
  const saleNumberById = new Map(salesQuery.data?.map((s) => [s.id, s.sale_number]));

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: (orderNoteId: string) => updateOrderNoteStatus(orderNoteId, "CANCELLED"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orderNotes"] }),
  });

  if (orderNotesQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-text-dim">Cargando notas de pedido...</p>
      </div>
    );
  }

  if (orderNotesQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(orderNotesQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Notas de pedido</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orderNotesQuery.data?.map((orderNote) => (
              <tr key={orderNote.id}>
                <td>{String(orderNote.order_note_number).padStart(6, "0")}</td>
                <td>{new Date(orderNote.created_at).toLocaleDateString()}</td>
                <td>{customerNameById.get(orderNote.customer_id) ?? "—"}</td>
                <td>${orderNote.total_amount.toFixed(2)}</td>
                <td>
                  {STATUS_LABELS[orderNote.status]}
                  {orderNote.status === "INVOICED" && orderNote.sale_id && (
                    <span className="text-text-dim">
                      {" "}
                      (Venta N°{" "}
                      {saleNumberById.has(orderNote.sale_id)
                        ? String(saleNumberById.get(orderNote.sale_id)).padStart(6, "0")
                        : "—"}
                      )
                    </span>
                  )}
                </td>
                <td className="flex flex-wrap gap-2">
                  {orderNote.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(orderNote.id)}
                      className="aura-btn-danger px-2 py-1"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={downloadingId === orderNote.id}
                    onClick={async () => {
                      setDownloadingId(orderNote.id);
                      try {
                        await downloadOrderNoteReceipt(orderNote.id);
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                    className="aura-btn-secondary px-2 py-1"
                  >
                    {downloadingId === orderNote.id ? "Generando..." : "PDF"}
                  </button>
                </td>
              </tr>
            ))}
            {orderNotesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-text-faint">
                  Sin notas de pedido todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {cancelMutation.isError && (
        <p role="alert" className="aura-alert">
          {(cancelMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
