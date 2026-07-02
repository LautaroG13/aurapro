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
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: healthy ? "#22c55e" : "#ef4444",
      }}
    />
  );
}

function ServiceRow({ service }: { service: ServiceStatus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <StatusDot healthy={service.healthy} />
      <span style={{ textTransform: "capitalize" }}>{service.name}</span>
      {!service.healthy && service.detail && (
        <span style={{ fontSize: 12, color: "#6b7280" }}>({service.detail})</span>
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
    <div>
      <h2>Estado del sistema</h2>

      {statusQuery.isLoading && <p>Chequeando servicios...</p>}
      {statusQuery.isError && <p role="alert">{(statusQuery.error as Error).message}</p>}
      {statusQuery.data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <ServiceRow service={statusQuery.data.postgres} />
          <ServiceRow service={statusQuery.data.redis} />
          <ServiceRow service={statusQuery.data.kafka} />
        </div>
      )}

      <h3>Backlog de outbox</h3>
      {outboxQuery.isLoading && <p>Cargando...</p>}
      {outboxQuery.isError && <p role="alert">{(outboxQuery.error as Error).message}</p>}
      {outboxQuery.data && (
        <p style={{ fontSize: 24, fontWeight: 700 }}>{outboxQuery.data.pending_count}</p>
      )}
    </div>
  );
}
