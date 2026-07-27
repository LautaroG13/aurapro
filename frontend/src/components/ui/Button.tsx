"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Colores literales (#0C1420, #F0A0A8) calcados del mockup para
// texto-sobre-accent / texto-de-danger-claro -- no tienen token propio
// en la spec, son ajustes puntuales de contraste, no parte del
// sistema de color reutilizable.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-[#0C1420] hover:brightness-110",
  secondary: "border border-border bg-surface-2 text-text hover:bg-[#2B3340]",
  ghost: "bg-transparent text-text-dim hover:bg-surface-2 hover:text-text",
  danger: "border border-danger/30 bg-danger-bg text-[#F0A0A8] hover:brightness-110",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 font-body text-[13px] font-semibold",
        "transition-[filter,background-color] focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
