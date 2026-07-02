"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { decodeToken, getStoredToken } from "@/lib/auth";

type GuardState = "checking" | "needs-login" | "authorized";

/**
 * Gate específico de /admin: además de exigir login (como AuthGate),
 * exige is_superadmin=true en el JWT. Un usuario logueado pero sin ese
 * claim no ve un mensaje de error acá -- se lo redirige directo al
 * dashboard de cliente normal (/sales), sin siquiera confirmarle que
 * /admin existe como concepto.
 *
 * Importante: esto es UX, no el borde de seguridad real. decodeToken
 * solo LEE el payload, no valida la firma -- evitarlo desde devtools es
 * trivial. La protección de verdad es server-side
 * (Depends(require_superadmin) en cada ruta de /api/v1/admin/*): si
 * alguien fuerza la navegación hasta acá, cada fetch igual devuelve 403.
 */
export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");

  const evaluate = useCallback(() => {
    const token = getStoredToken();
    if (!token) {
      setState("needs-login");
      return;
    }

    const payload = decodeToken(token);
    if (!payload?.is_superadmin) {
      router.replace("/sales");
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
    // onSuccess re-evalúa (no asume "autorizado" solo por loguearse):
    // si el usuario logueado no es superadmin, evaluate() lo redirige.
    return <LoginForm onSuccess={evaluate} />;
  }

  return <>{children}</>;
}
