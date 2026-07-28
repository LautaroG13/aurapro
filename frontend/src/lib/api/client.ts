import { getStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch autenticado compartido por products/customers/sales -- adjunta
 * el JWT guardado (ver lib/auth.ts) si existe. Los endpoints
 * legacy (analytics, system) no lo usan porque no requieren auth.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `Error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/**
 * Variante de apiFetch para respuestas binarias (ej. el PDF del
 * comprobante de venta) -- no fuerza Content-Type: application/json ni
 * intenta parsear la respuesta como JSON.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { headers });

  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `Error ${res.status}`);
  }

  return res.blob();
}

/**
 * Variante de apiFetch para subir un archivo (ej. el logo de la
 * empresa) -- no fuerza Content-Type: application/json, el browser
 * arma el boundary de multipart/form-data solo a partir de FormData.
 */
export async function apiFetchUpload<T>(path: string, file: File): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers, body: formData });

  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? `Error ${res.status}`);
  }

  return (await res.json()) as T;
}
