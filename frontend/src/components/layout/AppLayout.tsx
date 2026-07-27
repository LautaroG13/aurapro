"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/AuthGate";
import { decodeToken, getStoredToken } from "@/lib/auth";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// Rutas que abre alguien sin token todavía (invitación pendiente,
// recuperación de contraseña) -- no pueden pasar por AuthGate (que
// exige login) como el resto de la app.
const PUBLIC_PATH_PREFIXES = ["/invite/", "/forgot-password", "/reset-password/"];

// Vidriera de componentes del sistema de diseño (Fase 1, dev-only):
// arma su propio layout full-bleed en dark mode, no la tarjeta clara
// centrada de arriba, y tampoco requiere login.
const PUBLIC_STANDALONE_PATH_PREFIXES = ["/design-system"];

// Fase 2: páginas ya migradas al sistema de diseño oscuro. El resto
// (Ventas, Caja, Equipo, Admin, Inicio) sigue con el fondo claro de
// siempre hasta que se migren en una fase futura.
const DARK_MODE_PATH_PREFIXES = ["/products", "/customers"];

/**
 * Shell persistente de la app: sidebar + área de contenido.
 * El gate de autenticación lo sigue resolviendo AuthGate tal cual --
 * este componente no duplica esa lógica, solo la envuelve. Recién
 * cuando AuthGate decide renderizar children (hay token) es seguro
 * leer el token acá para saber si mostrar el link de Admin.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_STANDALONE_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return <>{children}</>;
  }

  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">{children}</div>;
  }

  return (
    <AuthGate>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthGate>
  );
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isSuperadmin, isAdmin } = useMemo(() => {
    const token = getStoredToken();
    const payload = token ? decodeToken(token) : null;
    return { isSuperadmin: Boolean(payload?.is_superadmin), isAdmin: payload?.role === "ADMIN" };
  }, []);

  // El fondo oscuro de <main> se activa solo para páginas ya migradas:
  // el resto (Ventas, Caja, Equipo, Admin, Inicio) renderiza <h1>/texto
  // suelto con el color oscuro de siempre -- pintar <main> de oscuro ahí
  // los dejaría con texto negro sobre fondo negro hasta que se migren.
  const isDarkPage = DARK_MODE_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  return (
    <div className="flex min-h-screen">
      <Sidebar isSuperadmin={isSuperadmin} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className={"flex-1 overflow-y-auto p-8" + (isDarkPage ? " bg-bg" : "")}>
          <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
