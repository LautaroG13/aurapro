"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { login } from "@/lib/api/auth";
import { setStoredToken } from "@/lib/auth";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
      setStoredToken(data.access_token);
      onSuccess();
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate();
        }}
        className="aura-card flex w-full max-w-sm flex-col gap-4"
      >
        <div>
          <h1 className="mb-1">AuraPro</h1>
          <h2 className="font-normal text-neutral-500">Iniciar sesión</h2>
        </div>

        <label className="aura-label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="aura-input"
          />
        </label>

        <label className="aura-label">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="aura-input"
          />
        </label>

        <button type="submit" disabled={loginMutation.isPending} className="aura-btn-primary">
          {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
        </button>

        {loginMutation.isError && (
          <p role="alert" className="aura-alert">
            {(loginMutation.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}
