import type { ReactNode } from "react";

import { cn } from "./cn";

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  helpText?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Encabezado único para todas las páginas de módulo (Productos,
 * Clientes, etc.). Reemplaza al <h1> suelto que tenía cada página.
 */
export function PageHeader({ title, subtitle, helpText, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold tracking-tight text-text">{title}</h1>
          {helpText && (
            <span
              tabIndex={0}
              title={helpText}
              aria-label={helpText}
              className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-border font-body text-[11px] font-semibold text-text-faint outline-none transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
            >
              ?
            </span>
          )}
        </div>
        {subtitle && <p className="font-body text-sm text-text-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
