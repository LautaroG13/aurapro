import type { ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action: EmptyStateAction;
  className?: string;
}

/**
 * Estado vacío con nombre del problema + CTA -- nunca un "sin datos"
 * genérico. `icon` e `title` los define quien lo usa según la sección.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-dim">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-sm font-semibold text-text">{title}</h3>
        {description && <p className="max-w-sm font-body text-sm text-text-dim">{description}</p>}
      </div>
      <Button variant="primary" className="mt-1" onClick={action.onClick}>
        {action.label}
      </Button>
    </div>
  );
}
