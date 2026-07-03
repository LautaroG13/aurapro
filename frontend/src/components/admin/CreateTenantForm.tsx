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
      className="aura-card flex flex-col gap-4"
    >
      <h2>Crear tenant</h2>

      <label className="aura-label">
        Nombre de la empresa
        <input
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Email del admin inicial
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          required
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Contraseña inicial
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          minLength={8}
          required
          className="aura-input"
        />
      </label>

      <button
        type="submit"
        disabled={createMutation.isPending}
        className="aura-btn-primary self-start"
      >
        {createMutation.isPending ? "Creando..." : "Crear tenant"}
      </button>

      {createMutation.isError && (
        <p role="alert" className="aura-alert">
          {(createMutation.error as Error).message}
        </p>
      )}
      {createMutation.isSuccess && (
        <p className="text-sm text-emerald-700">Tenant creado: {createMutation.data.name}</p>
      )}
    </form>
  );
}
