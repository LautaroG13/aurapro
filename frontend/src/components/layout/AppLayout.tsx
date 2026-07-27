"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/AuthGate";
import { decodeToken, getStoredToken } from "@/lib/auth";

import { Sidebar } from "./Sidebar";

// Rutas que abre alguien sin token todavía (invitación pendiente,
// recuperación de contraseña) -- no pueden pasar por AuthGate (que
// exige login) como el resto de la app.
const PUBLIC_PATH_PREFIXES = ["/invite/", "/forgot-password", "/reset-password/"];

/**
 * Shell persistente de la app: sidebar + área de contenido.
 * El gate de autenticación lo sigue resolviendo AuthGate tal cual --
 * este componente no duplica esa lógica, solo la envuelve. Recién
 * cuando AuthGate decide renderizar children (hay token) es seguro
 * leer el token acá para saber si mostrar el link de Admin.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isPublicRoute) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">{children}</div>;
  }

  return (
    <AuthGate>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthGate>
  );
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { isSuperadmin, isAdmin } = useMemo(() => {
    const token = getStoredToken();
    const payload = token ? decodeToken(token) : null;
    return { isSuperadmin: Boolean(payload?.is_superadmin), isAdmin: payload?.role === "ADMIN" };
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar isSuperadmin={isSuperadmin} isAdmin={isAdmin} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
