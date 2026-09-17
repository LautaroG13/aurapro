import { cn } from "./cn";

export type PlanBadgeVariant = "pro" | "pro-max" | "proximamente" | "contador";

export type PlanBadgeProps =
  | { variant: "pro" | "pro-max" | "proximamente"; className?: string }
  | { variant: "contador"; value: number; className?: string };

const VARIANT_CLASSES: Record<PlanBadgeVariant, string> = {
  pro: "border border-accent/30 bg-accent/10 text-accent",
  "pro-max": "border border-warn/30 bg-warn-bg text-warn",
  proximamente: "border border-border bg-surface-2 text-text-faint",
  contador: "border border-border bg-surface-2 text-text-dim",
};

const VARIANT_LABEL: Record<Exclude<PlanBadgeVariant, "contador">, string> = {
  pro: "PRO",
  "pro-max": "PRO MAX",
  proximamente: "Próximamente",
};

/**
 * NOTA IMPORTANTE: todavía no existe en el backend ningún mecanismo de
 * feature flags / plan por tenant (confirmado en la auditoría de Fase 0
 * -- el modelo Tenant no tiene campo de plan ni hay tabla tipo
 * `tenant_features`). Este componente queda listo a nivel visual, pero
 * NO está conectado a datos reales todavía: quien lo use hoy debe pasar
 * `variant`/`value` a mano. Conectarlo a un plan real requiere primero
 * ese modelo en `identity`.
 */
export function PlanBadge(props: PlanBadgeProps) {
  const { variant, className } = props;
  const label = variant === "contador" ? String(props.value) : VARIANT_LABEL[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-semibold uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
