"use client";

import { useQuery } from "@tanstack/react-query";

import { getStockAlert } from "@/lib/api/analytics";

interface StockAlertProps {
  productId: string;
  tenantId: string;
}

export function StockAlert({ productId, tenantId }: StockAlertProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stock-alert", tenantId, productId],
    queryFn: () => getStockAlert(productId, tenantId),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-neutral-500">Calculando pronóstico de stock...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="aura-card flex flex-col gap-1">
      <h3>Pronóstico de stock</h3>
      <p className="text-sm text-neutral-500">Producto: {data.product_id}</p>
      <p className="text-sm text-neutral-700">
        {data.days_until_out_of_stock === null
          ? "Sin quiebre de stock proyectado en el horizonte del pronóstico"
          : `Quiebre de stock estimado en ${data.days_until_out_of_stock} día(s)`}
      </p>
      <p className="text-sm text-neutral-500">Confianza: {(data.confidence * 100).toFixed(0)}%</p>
    </div>
  );
}
