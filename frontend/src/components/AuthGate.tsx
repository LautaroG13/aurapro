"use client";

import { useEffect, useState, type ReactNode } from "react";

import { LoginForm } from "@/components/LoginForm";
import { getStoredToken } from "@/lib/auth";

/**
 * Gate mínimo: muestra LoginForm si no hay token guardado, si no
 * renderiza children. El chequeo de "hasToken === null" evita un
 * parpadeo -- localStorage no existe en el render del servidor, así
 * que no se puede saber si hay token hasta el primer render en el
 * cliente.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(getStoredToken() !== null);
  }, []);

  if (hasToken === null) {
    return null;
  }

  if (!hasToken) {
    return <LoginForm onSuccess={() => setHasToken(true)} />;
  }

  return <>{children}</>;
}
