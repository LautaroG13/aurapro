"use client";

import { clearStoredToken } from "@/lib/auth";

import { NavLink } from "./NavLink";

interface SidebarProps {
  isSuperadmin: boolean;
  isAdmin: boolean;
}

export function Sidebar({ isSuperadmin, isAdmin }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5">
      <div className="mb-4 flex items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-[2px] bg-accent" />
        <span className="font-display text-lg font-bold tracking-tight text-text">AuraPro</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 pl-1">
        <NavLink href="/">Inicio</NavLink>
        <NavLink href="/sales">Ventas</NavLink>
        <NavLink href="/products">Productos</NavLink>
        <NavLink href="/customers">Clientes</NavLink>
        <NavLink href="/cash">Caja</NavLink>
        <NavLink href="/accounts">Cuenta corriente</NavLink>
        {isAdmin && <NavLink href="/team">Equipo</NavLink>}
        {isAdmin && <NavLink href="/company">Empresa</NavLink>}
        {isAdmin && <NavLink href="/integrations">Integraciones</NavLink>}
        {isSuperadmin && <NavLink href="/admin">Admin</NavLink>}
      </nav>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            clearStoredToken();
            window.location.reload();
          }}
          className="w-full rounded-[6px] px-2.5 py-2 text-left font-body text-[13.5px] font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
