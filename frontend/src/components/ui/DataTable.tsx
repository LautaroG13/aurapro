import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "./cn";

// Compound component, no genérico al 100% todavía (ver nota de la
// spec: priorizar que se vea bien en Productos, el próximo módulo a
// migrar, antes que una API abstracta con columnas tipadas). Se
// compone a mano: <DataTable.Root><DataTable.Head>...

function Root({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse", className)} {...props} />;
}

function Head({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

function HeaderCell({
  align = "left",
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "border-b border-border px-4 py-2.5 font-body text-[11px] font-semibold uppercase tracking-wide text-text-faint",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  );
}

function Body({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

function Row({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-surface-2", className)} {...props} />;
}

function Cell({
  numeric,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-border px-4 py-3 font-body text-[13.5px] text-text",
        numeric && "text-right font-mono",
        className
      )}
      {...props}
    />
  );
}

export const DataTable = { Root, Head, HeaderCell, Body, Row, Cell };
