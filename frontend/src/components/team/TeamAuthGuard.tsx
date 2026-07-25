"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { decodeToken, getStoredToken } from "@/lib/auth";

type GuardState = "checking" | "needs-login" | "authorized";

/**
 * Gate de /team: además de login (que AuthGate ya exige a nivel de
 * AppLayout), exige role=ADMIN en el JWT. Mismo patrón que
 * AdminAuthGuard (components/admin) pero contra `role`, no
 * `is_superadmin` -- son conceptos ortogonales, ver
 * identity/dependencies.py.
 */
export function TeamAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");

  const evaluate = useCallback(() => {
    const token = getStoredToken();
    if (!token) {
      setState("needs-login");
      return;
    }

    const payload = decodeToken(token);
    if (payload?.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    setState("authorized");
  }, [router]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  if (state === "checking") {
    return null;
  }

  if (state === "needs-login") {
    return <LoginForm onSuccess={evaluate} />;
  }

  return <>{children}</>;
}
