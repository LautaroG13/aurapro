"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { getCurrentUser } from "@/lib/api/auth";

// Prefijo de ruta -> título de página. Se recorre en orden así que "/"
// (Inicio) no matchea todo por accidente.
const PAGE_TITLES: Array<[string, string]> = [
  ["/products", "Productos"],
  ["/customers", "Clientes"],
  ["/sales", "Ventas"],
  ["/quotes", "Presupuestos"],
  ["/order-notes", "Notas de pedido"],
  ["/cash", "Caja"],
  ["/accounts", "Cuenta corriente"],
  ["/team", "Equipo"],
  ["/company", "Empresa"],
  ["/integrations", "Integraciones"],
  ["/admin", "Admin"],
];

function pageTitle(pathname: string | null): string {
  const match = pathname ? PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix)) : undefined;
  return match ? match[1] : "Inicio";
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function Topbar() {
  const pathname = usePathname();
  // Mismo endpoint que /team ya usa indirectamente (GET /auth/me
  // existe desde el sistema de invitaciones) -- solo se agrega el
  // cliente en lib/api/auth.ts, nada nuevo en el backend.
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser });

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <span className="font-display text-base font-semibold text-text">{pageTitle(pathname)}</span>
      <div
        className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-xs text-text-dim"
        title={meQuery.data?.email}
      >
        {meQuery.data ? initials(meQuery.data.email) : "···"}
      </div>
    </header>
  );
}
