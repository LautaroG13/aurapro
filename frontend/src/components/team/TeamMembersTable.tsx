"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteUser, listInvitations, listUsers, updateUser } from "@/lib/api/auth";
import { decodeToken, getStoredToken } from "@/lib/auth";
import type { UserRead } from "@/lib/api/types";

const ROLES: UserRead["role"][] = ["ADMIN", "VENDEDOR", "VIEWER"];

interface EditUserRowProps {
  user: UserRead;
  onDone: () => void;
}

function EditUserRow({ user, onDone }: EditUserRowProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [role, setRole] = useState<UserRead["role"]>(user.role);
  const [newPassword, setNewPassword] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      updateUser(user.id, {
        first_name: firstName || null,
        last_name: lastName || null,
        role,
        new_password: newPassword || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onDone();
    },
  });

  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-wrap items-end gap-2 py-2">
          <label className="aura-label">
            Nombre
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="aura-input"
            />
          </label>
          <label className="aura-label">
            Apellido
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="aura-input" />
          </label>
          <label className="aura-label">
            Rol
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRead["role"])}
              className="aura-input"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="aura-label">
            Nueva contraseña (opcional)
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="aura-input"
            />
          </label>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="aura-btn-primary px-3 py-1"
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={onDone} className="aura-btn-secondary px-3 py-1">
            Cancelar
          </button>
        </div>
        {saveMutation.isError && (
          <p role="alert" className="aura-alert">
            {(saveMutation.error as Error).message}
          </p>
        )}
      </td>
    </tr>
  );
}

export function TeamMembersTable() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const invitationsQuery = useQuery({ queryKey: ["invitations"], queryFn: listInvitations });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const currentUserId = (() => {
    const token = getStoredToken();
    return token ? (decodeToken(token)?.sub ?? null) : null;
  })();

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const pendingInvitations = invitationsQuery.data?.filter((invitation) => invitation.accepted_at === null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="aura-card flex flex-col gap-4">
        <h2>Usuarios</h2>
        {usersQuery.isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}
        {usersQuery.isError && (
          <p role="alert" className="aura-alert">
            {(usersQuery.error as Error).message}
          </p>
        )}
        {usersQuery.data && (
          <div className="overflow-x-auto">
            <table className="aura-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.map((user) =>
                  editingUserId === user.id ? (
                    <EditUserRow key={user.id} user={user} onDone={() => setEditingUserId(null)} />
                  ) : (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td>{user.role}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingUserId(user.id)}
                          className="aura-btn-secondary px-2 py-1"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar a "${user.email}"?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          disabled={deleteMutation.isPending || user.id === currentUserId}
                          title={user.id === currentUserId ? "No podés eliminar tu propia cuenta" : undefined}
                          className="aura-btn-danger px-2 py-1"
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        {deleteMutation.isError && (
          <p role="alert" className="aura-alert">
            {(deleteMutation.error as Error).message}
          </p>
        )}
      </div>

      <div className="aura-card flex flex-col gap-4">
        <h2>Invitaciones pendientes</h2>
        {invitationsQuery.isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}
        {invitationsQuery.isError && (
          <p role="alert" className="aura-alert">
            {(invitationsQuery.error as Error).message}
          </p>
        )}
        {invitationsQuery.data && (
          <div className="overflow-x-auto">
            <table className="aura-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Expira</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  return (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>{invitation.role}</td>
                      <td>{isExpired ? "Expirada" : "Pendiente"}</td>
                      <td>{new Date(invitation.expires_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {pendingInvitations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-neutral-400">
                      Sin invitaciones pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
