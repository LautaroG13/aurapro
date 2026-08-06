"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/AuthGate";
import { decodeToken, getStoredToken } from "@/lib/auth";
import { CurrentUserProvider } from "@/lib/currentUserContext";

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
    return <div className="flex min-h-screen items-center justify-center bg-bg p-6">{children}</div>;
  }

  return (
    <AuthGate>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </AuthGate>
  );
}

const SIDEBAR_COLLAPSED_KEY = "aurapro:sidebar-collapsed";

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, isSuperadmin, isAdmin } = useMemo(() => {
    const token = getStoredToken();
    const payload = token ? decodeToken(token) : null;
    return {
      role: payload?.role ?? null,
      isSuperadmin: Boolean(payload?.is_superadmin),
      isAdmin: payload?.role === "ADMIN",
    };
  }, []);

  // Lazy init: AuthGate ya garantiza que este árbol solo monta en el
  // cliente (ver su comentario sobre el parpadeo de SSR), así que leer
  // localStorage acá no genera mismatch de hidratación.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Navegar (incluido el propio click en un NavLink) cierra el drawer
  // mobile -- si no, queda tapando la página recién cargada.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <CurrentUserProvider value={{ role, isAdmin, isSuperadmin }}>
      <div className="flex min-h-screen">
        <Sidebar
          isSuperadmin={isSuperadmin}
          isAdmin={isAdmin}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex flex-1 flex-col">
          <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
