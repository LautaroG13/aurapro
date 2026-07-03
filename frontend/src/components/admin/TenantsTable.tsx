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
    return (
      <div className="aura-card">
        <p className="text-sm text-neutral-500">Cargando tenants...</p>
      </div>
    );
  }

  if (tenantsQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(tenantsQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>Tenants</h2>
      <div className="overflow-x-auto">
        <table className="aura-table">
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
                <td>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (tenant.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-500")
                    }
                  >
                    {tenant.is_active ? "Activo" : "Suspendido"}
                  </span>
                </td>
                <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                <td>
                  {tenant.is_active ? (
                    <button
                      type="button"
                      onClick={() => suspendMutation.mutate(tenant.id)}
                      disabled={suspendMutation.isPending}
                      className="aura-btn-danger px-3 py-1"
                    >
                      Suspender
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activateMutation.mutate(tenant.id)}
                      disabled={activateMutation.isPending}
                      className="aura-btn-secondary px-3 py-1"
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tenantsQuery.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-neutral-400">
                  Sin tenants todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(suspendMutation.isError || activateMutation.isError) && (
        <p role="alert" className="aura-alert">
          {((suspendMutation.error ?? activateMutation.error) as Error).message}
        </p>
      )}
    </div>
  );
}
