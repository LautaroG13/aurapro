import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-base border border-border bg-surface", className)} {...props} />;
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaDirection?: "up" | "down" | "neutral";
  className?: string;
}

const DELTA_COLOR: Record<NonNullable<StatCardProps["deltaDirection"]>, string> = {
  up: "text-success",
  down: "text-danger",
  neutral: "text-text-dim",
};

export function StatCard({ label, value, delta, deltaDirection = "neutral", className }: StatCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="font-body text-xs text-text-dim">{label}</div>
      <div className="mt-2 font-mono text-2xl font-medium tracking-tight text-text">{value}</div>
      {delta != null && (
        <div className={cn("mt-1.5 font-mono text-[11.5px]", DELTA_COLOR[deltaDirection])}>{delta}</div>
      )}
    </Card>
  );
}
