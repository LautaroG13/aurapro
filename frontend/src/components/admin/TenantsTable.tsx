"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { activateTenant, listTenants, suspendTenant } from "@/lib/api/admin";

export function TenantsTable() {
  const queryClient = useQueryClient();
  const tenantsQuery = useQuery({ queryKey: ["admin-tenants"], queryFn: listTenants });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const suspendMutation = useMutation({ mutationFn: suspendTenant, onSuccess: invalidate });
  const activateMutation = useMutation({ mutationFn: activateTenant, onSuccess: invalidate });

  if (tenantsQuery.isLoading) {
    return <p>Cargando tenants...</p>;
  }

  if (tenantsQuery.isError) {
    return <p role="alert">{(tenantsQuery.error as Error).message}</p>;
  }

  return (
    <div>
      <h2>Tenants</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuarios</th>
            <th>Estado</th>
            <th>Creado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tenantsQuery.data?.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.user_count}</td>
              <td>{tenant.is_active ? "Activo" : "Suspendido"}</td>
              <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
              <td>
                {tenant.is_active ? (
                  <button
                    type="button"
                    onClick={() => suspendMutation.mutate(tenant.id)}
                    disabled={suspendMutation.isPending}
                  >
                    Suspender
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => activateMutation.mutate(tenant.id)}
                    disabled={activateMutation.isPending}
                  >
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
          {tenantsQuery.data?.length === 0 && (
            <tr>
              <td colSpan={5}>Sin tenants todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
      {(suspendMutation.isError || activateMutation.isError) && (
        <p role="alert">
          {((suspendMutation.error ?? activateMutation.error) as Error).message}
        </p>
      )}
    </div>
  );
}
