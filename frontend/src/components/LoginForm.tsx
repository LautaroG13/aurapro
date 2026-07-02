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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        loginMutation.mutate();
      }}
    >
      <h2>Iniciar sesión</h2>
      <div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
      </div>
      <button type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
      </button>
      {loginMutation.isError && <p role="alert">{(loginMutation.error as Error).message}</p>}
    </form>
  );
}
