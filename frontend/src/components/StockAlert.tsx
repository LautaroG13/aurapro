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
    return <p>Calculando pronóstico de stock...</p>;
  }

  if (isError) {
    return <p role="alert">{(error as Error).message}</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div>
      <p>Producto: {data.product_id}</p>
      <p>
        {data.days_until_out_of_stock === null
          ? "Sin quiebre de stock proyectado en el horizonte del pronóstico"
          : `Quiebre de stock estimado en ${data.days_until_out_of_stock} día(s)`}
      </p>
      <p>Confianza: {(data.confidence * 100).toFixed(0)}%</p>
    </div>
  );
}
