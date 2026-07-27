"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteIntegration, listIntegrations, upsertIntegration } from "@/lib/api/integrations";

interface ConfigRow {
  key: string;
  value: string;
}

function newRow(key = ""): ConfigRow {
  return { key, value: "" };
}

interface IntegrationFormProps {
  // null = alta nueva. string = editando ese proveedor (nombre fijo,
  // precargado con sus claves existentes pero SIN valores -- el
  // backend nunca los devuelve, ver IntegrationRead.config_keys).
  editingProvider: string | null;
  existingKeys: string[];
  onDone: () => void;
}

function IntegrationForm({ editingProvider, existingKeys, onDone }: IntegrationFormProps) {
  const queryClient = useQueryClient();
  const [providerName, setProviderName] = useState(editingProvider ?? "");
  const [rows, setRows] = useState<ConfigRow[]>(
    existingKeys.length > 0 ? existingKeys.map((key) => newRow(key)) : [newRow()]
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const config = Object.fromEntries(
        rows
          .map((row) => [row.key.trim(), row.value.trim()] as const)
          .filter(([key, value]) => key !== "" && value !== "")
      );
      return upsertIntegration(providerName.trim(), { config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onDone();
    },
  });

  const canSave =
    providerName.trim() !== "" &&
    rows.some((row) => row.key.trim() !== "" && row.value.trim() !== "");

  return (
    <div className="aura-card flex flex-col gap-4">
      <h2>{editingProvider ? `Editar ${editingProvider}` : "Nueva integración"}</h2>

      <label className="aura-label">
        Nombre del proveedor
        <input
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          disabled={editingProvider !== null}
          placeholder="Ej: Mercado Pago"
          className="aura-input"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-dim">
          Campos de configuración
          {editingProvider && (
            <span className="font-normal">
              {" "}
              (por seguridad los valores no se muestran -- volvé a escribir los que quieras conservar; los
              que dejes vacíos se borran)
            </span>
          )}
        </span>
        {rows.map((row, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={row.key}
              onChange={(e) =>
                setRows(rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))
              }
              placeholder="Nombre del campo (ej: access_token)"
              className="aura-input"
            />
            <input
              value={row.value}
              onChange={(e) =>
                setRows(rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
              }
              placeholder="Valor"
              className="aura-input"
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
              disabled={rows.length === 1}
              className="aura-btn-secondary shrink-0 px-2"
            >
              -
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows([...rows, newRow()])}
          className="aura-btn-secondary self-start px-2"
        >
          + Campo
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canSave || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="aura-btn-primary self-start"
        >
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={onDone} className="aura-btn-secondary self-start">
          Cancelar
        </button>
      </div>

      {saveMutation.isError && (
        <p role="alert" className="aura-alert">
          {(saveMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}

export function IntegrationsPanel() {
  const queryClient = useQueryClient();
  const integrationsQuery = useQuery({ queryKey: ["integrations"], queryFn: listIntegrations });
  const [formTarget, setFormTarget] = useState<"new" | string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  if (formTarget !== null) {
    const editingKeys =
      formTarget === "new" ? [] : (integrationsQuery.data?.find((i) => i.provider === formTarget)?.config_keys ?? []);
    return (
      <IntegrationForm
        editingProvider={formTarget === "new" ? null : formTarget}
        existingKeys={editingKeys}
        onDone={() => setFormTarget(null)}
      />
    );
  }

  return (
    <div className="aura-card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2>Integraciones configuradas</h2>
        <button type="button" onClick={() => setFormTarget("new")} className="aura-btn-primary px-3 py-1">
          + Nueva integración
        </button>
      </div>

      <p className="text-sm text-text-dim">
        Credenciales de plataformas externas (pasarelas de pago, facturación electrónica, etc.) que se
        conectan por API. Ninguna integración está conectada todavía -- esto solo guarda la configuración
        para cuando se active.
      </p>

      {integrationsQuery.isLoading && <p className="text-sm text-text-dim">Cargando...</p>}
      {integrationsQuery.isError && (
        <p role="alert" className="aura-alert">
          {(integrationsQuery.error as Error).message}
        </p>
      )}

      {integrationsQuery.data && (
        <div className="overflow-x-auto">
          <table className="aura-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Campos configurados</th>
                <th>Última actualización</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {integrationsQuery.data.map((integration) => (
                <tr key={integration.provider}>
                  <td>{integration.provider}</td>
                  <td className="font-mono text-xs text-text-dim">{integration.config_keys.join(", ")}</td>
                  <td>{new Date(integration.updated_at).toLocaleString()}</td>
                  <td className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTarget(integration.provider)}
                      className="aura-btn-secondary px-2 py-1"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Borrar la configuración de "${integration.provider}"?`)) {
                          deleteMutation.mutate(integration.provider);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="aura-btn-danger px-2 py-1"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {integrationsQuery.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-text-faint">
                    Sin integraciones configuradas todavía.
                  </td>
                </tr>
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
  );
}
