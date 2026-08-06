"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

interface NavLinkProps {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function NavLink({ href, label, icon: Icon, collapsed = false, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={
        "flex items-center gap-2.5 rounded-[6px] border-l-2 py-2 font-body text-[13.5px] font-medium transition-colors " +
        (collapsed ? "justify-center px-[7px]" : "pl-2 pr-2.5") +
        " " +
        (isActive
          ? "border-accent bg-surface-2 text-text"
          : "border-transparent text-text-dim hover:bg-surface-2 hover:text-text")
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
