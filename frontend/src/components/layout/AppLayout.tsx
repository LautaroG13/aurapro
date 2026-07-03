"use client";

import { useMemo, type ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";
import { decodeToken, getStoredToken } from "@/lib/auth";

import { Sidebar } from "./Sidebar";

/**
 * Shell persistente de la app: sidebar + área de contenido.
 * El gate de autenticación lo sigue resolviendo AuthGate tal cual --
 * este componente no duplica esa lógica, solo la envuelve. Recién
 * cuando AuthGate decide renderizar children (hay token) es seguro
 * leer el token acá para saber si mostrar el link de Admin.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthGate>
  );
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const isSuperadmin = useMemo(() => {
    const token = getStoredToken();
    return token ? Boolean(decodeToken(token)?.is_superadmin) : false;
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar isSuperadmin={isSuperadmin} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
