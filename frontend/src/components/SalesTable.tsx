"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listCustomers } from "@/lib/api/customers";
import { downloadSaleReceipt, listSales } from "@/lib/api/sales";
import { paymentMethodLabel } from "@/lib/paymentMethods";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export function SalesTable() {
  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: listSales });
  // Comparte queryKey con SaleForm/CustomerForm -- React Query dedupea,
  // no dispara un fetch extra. Se usa acá solo para resolver
  // customer_id -> nombre en la columna "Cliente".
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const customerNameById = new Map(customersQuery.data?.map((c) => [c.id, c.name]));

  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(null);

  if (salesQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-text-dim">Cargando ventas...</p>
      </div>
    );
  }

  if (salesQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(salesQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Ventas recientes</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Ítems</th>
              <th>Total</th>
              <th>Medio de pago</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {salesQuery.data?.map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.created_at).toLocaleString()}</td>
                <td>{customerNameById.get(sale.customer_id) ?? "—"}</td>
                <td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td>
                  ${sale.total_amount.toFixed(2)} {sale.currency}
                </td>
                <td>{paymentMethodLabel(sale.payment_method)}</td>
                <td>{STATUS_LABELS[sale.status] ?? sale.status}</td>
                <td>
                  <button
                    type="button"
                    disabled={downloadingSaleId === sale.id}
                    onClick={async () => {
                      setDownloadingSaleId(sale.id);
                      try {
                        await downloadSaleReceipt(sale.id);
                      } finally {
                        setDownloadingSaleId(null);
                      }
                    }}
                    className="aura-btn-secondary px-3 py-1"
                  >
                    {downloadingSaleId === sale.id ? "Generando..." : "Comprobante"}
                  </button>
                </td>
              </tr>
            ))}
            {salesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-text-faint">
                  Sin ventas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
