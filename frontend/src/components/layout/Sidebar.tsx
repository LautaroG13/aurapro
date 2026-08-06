"use client";

import { useEffect } from "react";

import { cn } from "@/components/ui/cn";
import { clearStoredToken } from "@/lib/auth";

import { NavLink } from "./NavLink";
import { CollapseIcon, ExpandIcon, LogOutIcon } from "./navIcons";
import { isNavItemVisible, NAV_GROUPS } from "./navConfig";

interface SidebarProps {
  isSuperadmin: boolean;
  isAdmin: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  isSuperadmin,
  isAdmin,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  // Esc cierra el drawer en mobile -- no tiene sentido dejarlo abierto
  // atrapando el foco sin una salida por teclado.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMobile();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-border bg-surface py-5 md:flex",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-[64px] px-2" : "w-60 px-3.5"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          isSuperadmin={isSuperadmin}
          isAdmin={isAdmin}
          onToggleCollapsed={onToggleCollapsed}
        />
      </aside>

      {/* Montado solo cuando está abierto -- un overlay full-screen siempre
          presente (con pointer-events-none cuando "cerrado") terminaba
          tapando el botón de hamburguesa del Topbar igual, porque su
          z-index gana por encima aunque sea invisible/no interactivo.
          Sin animación de salida como trade-off por la simplicidad. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onCloseMobile}
            className="absolute inset-y-0 left-64 right-0 bg-black/50"
          />
          <aside className="absolute inset-y-0 left-0 z-10 flex w-64 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5 shadow-xl">
            <SidebarContent
              collapsed={false}
              isSuperadmin={isSuperadmin}
              isAdmin={isAdmin}
              onNavigate={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  isSuperadmin: boolean;
  isAdmin: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, isSuperadmin, isAdmin, onToggleCollapsed, onNavigate }: SidebarContentProps) {
  return (
    <>
      <div className={cn("mb-4 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <span className="h-2 w-2 shrink-0 rounded-[2px] bg-accent" />
        {!collapsed && <span className="font-display text-lg font-bold tracking-tight text-text">AuraPro</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto pl-1">
        {NAV_GROUPS.map((group, index) => {
          const items = group.items.filter((item) => isNavItemVisible(item, isAdmin, isSuperadmin));
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? `group-${index}`} className="flex flex-col gap-0.5">
              {group.label && !collapsed && (
                <span className="mb-1 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  {group.label}
                </span>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className={cn(
              "flex items-center gap-2.5 rounded-[6px] py-2 font-body text-[13.5px] font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text",
              collapsed ? "justify-center px-2" : "px-2.5"
            )}
          >
            {collapsed ? <ExpandIcon className="h-[18px] w-[18px]" /> : <CollapseIcon className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Colapsar</span>}
          </button>
        )}
        <button
          type="button"
          title={collapsed ? "Cerrar sesión" : undefined}
          aria-label={collapsed ? "Cerrar sesión" : undefined}
          onClick={() => {
            clearStoredToken();
            window.location.reload();
          }}
          className={cn(
            "flex items-center gap-2.5 rounded-[6px] py-2 font-body text-[13.5px] font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text",
            collapsed ? "justify-center px-2" : "px-2.5"
          )}
        >
          <LogOutIcon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  );
}
