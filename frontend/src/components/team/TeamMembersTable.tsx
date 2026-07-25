"use client";

import { useQuery } from "@tanstack/react-query";

import { listInvitations, listUsers } from "@/lib/api/auth";

export function TeamMembersTable() {
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const invitationsQuery = useQuery({ queryKey: ["invitations"], queryFn: listInvitations });

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
                  <th>Rol</th>
                  <th>Alta</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
