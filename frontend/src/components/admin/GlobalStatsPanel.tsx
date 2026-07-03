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
    return (
      <div className="aura-card">
        <p className="text-sm text-neutral-500">Cargando estadísticas...</p>
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(statsQuery.error as Error).message}
        </p>
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) return null;

  const entries: [string, string][] = [
    ["Tenants", String(stats.total_tenants)],
    ["Usuarios", String(stats.total_users)],
    ["Productos", String(stats.total_products)],
    ["Clientes", String(stats.total_customers)],
    ["Ventas", String(stats.total_sales)],
    ["Revenue total", `$${stats.total_revenue.toFixed(2)}`],
  ];

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Estadísticas globales</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
            <p className="text-lg font-semibold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
