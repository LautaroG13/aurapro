"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptInvitation, previewInvitation } from "@/lib/api/auth";
import { setStoredToken } from "@/lib/auth";

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const previewQuery = useQuery({
    queryKey: ["invitationPreview", token],
    queryFn: () => previewInvitation(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(token, password),
    onSuccess: (data) => {
      setStoredToken(data.access_token);
      router.replace("/");
    },
  });

  if (previewQuery.isLoading) {
    return <p className="text-sm text-neutral-500">Cargando invitación...</p>;
  }

  if (previewQuery.isError) {
    return (
      <div className="aura-card w-full max-w-sm">
        <p role="alert" className="aura-alert">
          {(previewQuery.error as Error).message}
        </p>
      </div>
    );
  }

  const invitation = previewQuery.data;
  if (!invitation) {
    return null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        acceptMutation.mutate();
      }}
      className="aura-card flex w-full max-w-sm flex-col gap-4"
    >
      <div>
        <h1 className="mb-1">AuraPro</h1>
        <h2 className="font-normal text-neutral-500">
          Te invitaron a <strong>{invitation.tenant_name}</strong> como {invitation.role}
        </h2>
      </div>

      <p className="text-sm text-neutral-500">{invitation.email}</p>

      <label className="aura-label">
        Elegí una contraseña
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <button type="submit" disabled={acceptMutation.isPending} className="aura-btn-primary">
        {acceptMutation.isPending ? "Creando cuenta..." : "Aceptar y crear cuenta"}
      </button>

      {acceptMutation.isError && (
        <p role="alert" className="aura-alert">
          {(acceptMutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
