"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createTenant } from "@/lib/api/admin";

export function CreateTenantForm() {
  const queryClient = useQueryClient();
  const [tenantName, setTenantName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createTenant({
        tenant_name: tenantName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      }),
    onSuccess: () => {
      setTenantName("");
      setAdminEmail("");
      setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate();
      }}
    >
      <h2>Crear tenant</h2>
      <div>
        <label>
          Nombre de la empresa
          <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
        </label>
      </div>
      <div>
        <label>
          Email del admin inicial
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Contraseña inicial
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
      </div>
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creando..." : "Crear tenant"}
      </button>
      {createMutation.isError && <p role="alert">{(createMutation.error as Error).message}</p>}
      {createMutation.isSuccess && <p>Tenant creado: {createMutation.data.name}</p>}
    </form>
  );
}
