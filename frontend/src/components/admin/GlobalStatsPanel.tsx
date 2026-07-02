"use client";

import { useQuery } from "@tanstack/react-query";

import { getGlobalStats } from "@/lib/api/admin";

export function GlobalStatsPanel() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getGlobalStats,
    refetchInterval: 30_000,
  });

  if (statsQuery.isLoading) {
    return <p>Cargando estadísticas...</p>;
  }

  if (statsQuery.isError) {
    return <p role="alert">{(statsQuery.error as Error).message}</p>;
  }

  const stats = statsQuery.data;
  if (!stats) return null;

  return (
    <div>
      <h2>Estadísticas globales</h2>
      <ul>
        <li>Tenants: {stats.total_tenants}</li>
        <li>Usuarios: {stats.total_users}</li>
        <li>Productos: {stats.total_products}</li>
        <li>Clientes: {stats.total_customers}</li>
        <li>Ventas: {stats.total_sales}</li>
        <li>Revenue total: ${stats.total_revenue.toFixed(2)}</li>
      </ul>
    </div>
  );
}
