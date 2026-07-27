"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn } from "./cn";

// bg-bg (no bg-surface) a propósito -- ver AuraPro_Design_System_Dark.md
// sección 4.3: el campo tiene que distinguirse del panel/card que lo
// contiene, que ya usa surface.
const FIELD_BASE = cn(
  "w-full rounded-md border border-border bg-bg px-2.5 py-2 font-body text-[13.5px] text-text",
  "outline-none transition-colors placeholder:text-text-faint",
  "focus:border-accent focus:ring-2 focus:ring-accent/15",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const ERROR_CLASSES = "border-danger focus:border-danger focus:ring-danger/15";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return <input className={cn(FIELD_BASE, error && ERROR_CLASSES, className)} {...props} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className, ...props }: SelectProps) {
  return <select className={cn(FIELD_BASE, error && ERROR_CLASSES, className)} {...props} />;
}
