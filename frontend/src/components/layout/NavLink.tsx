"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={
        "relative block rounded-[6px] px-2.5 py-2 font-body text-[13.5px] font-medium transition-colors " +
        (isActive
          ? "bg-surface-2 text-text before:absolute before:inset-y-2 before:-left-3.5 before:w-0.5 before:rounded-full before:bg-accent before:content-['']"
          : "text-text-dim hover:bg-surface-2 hover:text-text")
      }
    >
      {children}
    </Link>
  );
}
