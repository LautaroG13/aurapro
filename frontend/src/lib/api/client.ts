import { clearStoredToken, getStoredToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// El JWT expira a los 60 min (backend/app/core/config.py) y no hay
// refresh token -- sin esto, cualquier pantalla que siga abierta más
// de una hora se queda pidiendo datos que el backend rechaza con 401
// para siempre, sin ningún aviso (AuthGate solo chequea que haya un
// token guardado al montar, no si sigue siendo válido). isRedirecting
// evita disparar el reload más de una vez cuando varias queries en
// paralelo (ej. el dashboard) reciben 401 al mismo tiempo.
let isRedirectingToLogin = false;

function handleUnauthorized(): void {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  clearStoredToken();
  window.location.reload();
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * `detail` en un error de FastAPI puede ser un string (HTTPException
 * escrita a mano, ej. "Cliente no encontrado") o un array de objetos
 * de validación de Pydantic (422 default, ej. Field(gt=0) fallido) --
 * sin este chequeo, el array se coacciona a string y termina
 * mostrando "[object Object]" en el aura-alert de cada form.
 */
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item),
        )
        .join("; ");
    }
  }
  return `Error ${status}`;
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
    if (res.status === 401) handleUnauthorized();
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(body, res.status));
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
    if (res.status === 401) handleUnauthorized();
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(body, res.status));
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
    if (res.status === 401) handleUnauthorized();
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractErrorMessage(body, res.status));
  }

  return (await res.json()) as T;
}
