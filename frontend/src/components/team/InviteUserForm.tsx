"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createInvitation } from "@/lib/api/auth";
import type { InvitationCreate } from "@/lib/api/types";

const ROLES: InvitationCreate["role"][] = ["ADMIN", "VENDEDOR", "VIEWER"];

export function InviteUserForm() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationCreate["role"]>("VENDEDOR");

  const inviteMutation = useMutation({
    mutationFn: () => createInvitation({ email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setEmail("");
      setRole("VENDEDOR");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        inviteMutation.mutate();
      }}
      className="aura-card flex flex-col gap-4"
    >
      <h2>Invitar usuario</h2>

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
        Rol
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as InvitationCreate["role"])}
          className="aura-input"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={inviteMutation.isPending} className="aura-btn-primary self-start">
        {inviteMutation.isPending ? "Enviando..." : "Enviar invitación"}
      </button>

      {inviteMutation.isError && (
        <p role="alert" className="aura-alert">
          {(inviteMutation.error as Error).message}
        </p>
      )}
      {inviteMutation.isSuccess && (
        <p className="text-sm text-success">Invitación enviada a {inviteMutation.data.email}.</p>
      )}
    </form>
  );
}
