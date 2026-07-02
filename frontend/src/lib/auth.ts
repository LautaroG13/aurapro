/**
 * Almacenamiento del JWT en el browser. Deliberadamente mínimo -- sin
 * refresh token, sin manejo de expiración proactivo. Es lo justo para
 * que la pantalla de ventas pueda llamar a endpoints protegidos; un
 * flujo de auth "real" (logout global, refresh, rutas protegidas por
 * middleware de Next.js) queda para una iteración futura.
 */

const TOKEN_STORAGE_KEY = "aurapro_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export interface TokenPayload {
  sub: string;
  tenant_id: string;
  role: string;
  is_superadmin: boolean;
  exp: number;
}

/**
 * Decodifica el payload del JWT SIN validar la firma -- esto es
 * deliberado y seguro: solo se usa para decidir qué mostrar/a dónde
 * navegar en el cliente (ver AdminAuthGuard), nunca para decisiones de
 * autorización reales. La autorización de verdad la hace el backend en
 * cada request (require_superadmin), que sí valida la firma. Si
 * alguien edita el payload a mano en devtools, el peor caso es que ve
 * un botón que no debería -- cualquier fetch real sigue devolviendo 403.
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payloadB64] = token.split(".");
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}
