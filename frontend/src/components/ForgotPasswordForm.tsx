"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { forgotPassword } from "@/lib/api/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");

  const forgotMutation = useMutation({
    mutationFn: () => forgotPassword({ email }),
  });

  if (forgotMutation.isSuccess) {
    return (
      <div className="aura-card flex w-full max-w-sm flex-col gap-4">
        <h1 className="mb-1">AuraPro</h1>
        <p className="text-sm text-text-dim">
          Si <strong>{email}</strong> está registrado, te va a llegar un email con instrucciones para elegir
          una contraseña nueva.
        </p>
        <Link href="/" className="text-sm text-text-dim hover:text-text hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        forgotMutation.mutate();
      }}
      className="aura-card flex w-full max-w-sm flex-col gap-4"
    >
      <div>
        <h1 className="mb-1">AuraPro</h1>
        <h2 className="font-normal text-text-dim">Recuperar contraseña</h2>
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

      <button type="submit" disabled={forgotMutation.isPending} className="aura-btn-primary">
        {forgotMutation.isPending ? "Enviando..." : "Enviar instrucciones"}
      </button>

      <Link href="/" className="text-sm text-text-dim hover:text-text hover:underline">
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
