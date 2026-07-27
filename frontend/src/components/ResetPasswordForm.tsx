"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { resetPassword } from "@/lib/api/auth";
import { setStoredToken } from "@/lib/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const resetMutation = useMutation({
    mutationFn: () => resetPassword(token, { password }),
    onSuccess: (data) => {
      setStoredToken(data.access_token);
      router.replace("/");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        resetMutation.mutate();
      }}
      className="aura-card flex w-full max-w-sm flex-col gap-4"
    >
      <div>
        <h1 className="mb-1">AuraPro</h1>
        <h2 className="font-normal text-text-dim">Elegí una contraseña nueva</h2>
      </div>

      <label className="aura-label">
        Contraseña nueva
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <button type="submit" disabled={resetMutation.isPending} className="aura-btn-primary">
        {resetMutation.isPending ? "Guardando..." : "Guardar y entrar"}
      </button>

      {resetMutation.isError && (
        <p role="alert" className="aura-alert">
          {(resetMutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
