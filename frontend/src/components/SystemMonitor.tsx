"use client";

import { useQuery } from "@tanstack/react-query";

import { getOutboxStats, getSystemStatus } from "@/lib/api/system";
import type { ServiceStatus } from "@/lib/api/types";

const POLL_INTERVAL_MS = 10_000;

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      role="status"
      aria-label={healthy ? "operativo" : "caído"}
      className={"inline-block h-2.5 w-2.5 rounded-full " + (healthy ? "bg-emerald-500" : "bg-red-500")}
    />
  );
}

function ServiceRow({ service }: { service: ServiceStatus }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <StatusDot healthy={service.healthy} />
      <span className="capitalize text-neutral-700">{service.name}</span>
      {!service.healthy && service.detail && (
        <span className="text-xs text-neutral-500">({service.detail})</span>
      )}
    </div>
  );
}

export function SystemMonitor() {
  const statusQuery = useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const outboxQuery = useQuery({
    queryKey: ["outbox-stats"],
    queryFn: getOutboxStats,
    refetchInterval: POLL_INTERVAL_MS,
  });

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Estado del sistema</h2>

      {statusQuery.isLoading && <p className="text-sm text-neutral-500">Chequeando servicios...</p>}
      {statusQuery.isError && (
        <p role="alert" className="aura-alert">
          {(statusQuery.error as Error).message}
        </p>
      )}
      {statusQuery.data && (
        <div className="flex flex-col gap-2">
          <ServiceRow service={statusQuery.data.postgres} />
          <ServiceRow service={statusQuery.data.redis} />
          <ServiceRow service={statusQuery.data.kafka} />
        </div>
      )}

      <div>
        <h3>Backlog de outbox</h3>
        {outboxQuery.isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}
        {outboxQuery.isError && (
          <p role="alert" className="aura-alert">
            {(outboxQuery.error as Error).message}
          </p>
        )}
        {outboxQuery.data && (
          <p className="text-2xl font-bold text-neutral-900">{outboxQuery.data.pending_count}</p>
        )}
      </div>
    </div>
  );
}
