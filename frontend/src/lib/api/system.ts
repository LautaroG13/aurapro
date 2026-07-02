import type { OutboxStatsResponse, SystemStatusResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * GET /api/v1/system/status devuelve 200 cuando los 3 servicios están
 * sanos, o 503 cuando alguno falla — en ambos casos con el mismo
 * desglose por servicio en el body (FastAPI envuelve el `detail` de un
 * HTTPException bajo la key "detail", por eso el chequeo de abajo). Un
 * 503 con desglose es *dato útil* para este dashboard, no un error de
 * fetch: por eso no se tira una excepción en ese caso, para que
 * useQuery llegue a "success" y el componente pueda pintar qué servicio
 * está caído en vez de mostrar un estado de error genérico.
 */
export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch(`${API_URL}/api/v1/system/status`);
  const body = await res.json();

  if (!res.ok) {
    if (body?.detail) {
      return body.detail as SystemStatusResponse;
    }
    throw new Error(`Error ${res.status} al obtener el estado del sistema`);
  }

  return body as SystemStatusResponse;
}

export async function getOutboxStats(): Promise<OutboxStatsResponse> {
  const res = await fetch(`${API_URL}/api/v1/system/outbox-stats`);

  if (!res.ok) {
    throw new Error(`Error ${res.status} al obtener el backlog del outbox`);
  }

  return (await res.json()) as OutboxStatsResponse;
}
