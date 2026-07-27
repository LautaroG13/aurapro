import { cn } from "./cn";

export type StatusDotStatus = "ok" | "low" | "out";

// El halo (box-shadow) usa el token *-bg de cada estado -- mismo
// truco que el mockup: un shadow de 3px sin blur simula un anillo
// suave sin necesitar un segundo elemento.
const STATUS_CLASSES: Record<StatusDotStatus, string> = {
  ok: "bg-success shadow-[0_0_0_3px_var(--color-success-bg)]",
  low: "bg-warn shadow-[0_0_0_3px_var(--color-warn-bg)]",
  out: "bg-danger shadow-[0_0_0_3px_var(--color-danger-bg)]",
};

export interface StatusDotProps {
  status: StatusDotStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return <span className={cn("inline-block h-[7px] w-[7px] shrink-0 rounded-full", STATUS_CLASSES[status], className)} />;
}
