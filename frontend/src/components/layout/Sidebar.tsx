"use client";

import { clearStoredToken } from "@/lib/auth";

import { NavLink } from "./NavLink";

interface SidebarProps {
  isSuperadmin: boolean;
}

export function Sidebar({ isSuperadmin }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-4 py-5">
        <span className="text-lg font-semibold tracking-tight text-neutral-900">AuraPro</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        <NavLink href="/">Inicio</NavLink>
        <NavLink href="/sales">Ventas</NavLink>
        <NavLink href="/products">Productos</NavLink>
        {isSuperadmin && <NavLink href="/admin">Admin</NavLink>}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={() => {
            clearStoredToken();
            window.location.reload();
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
