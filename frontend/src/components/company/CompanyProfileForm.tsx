"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getTenantLogoObjectUrl, getTenantProfile, updateTenantProfile, uploadTenantLogo } from "@/lib/api/tenant";
import type { CustomerTaxStatus } from "@/lib/api/types";

const TAX_STATUSES: CustomerTaxStatus[] = ["RESPONSABLE_INSCRIPTO", "MONOTRIBUTO", "EXENTO"];

function LogoUploader({ hasLogo }: { hasLogo: boolean }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Reemplazar un logo existente no cambia hasLogo (sigue en true
  // antes y después) -- sin este contador, el efecto de abajo no
  // tenía ningún motivo para volver a correr, así que el preview
  // seguía mostrando el logo viejo hasta un reload completo.
  const [logoVersion, setLogoVersion] = useState(0);

  useEffect(() => {
    if (!hasLogo) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    getTenantLogoObjectUrl().then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasLogo, logoVersion]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadTenantLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantProfile"] });
      setLogoVersion((v) => v + 1);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-dim">Logo de la empresa</span>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-base border border-border bg-bg">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL de blob, no un asset estático
            <img src={previewUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-text-faint">Sin logo</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="aura-btn-secondary px-3 py-1"
          >
            {uploadMutation.isPending ? "Subiendo..." : hasLogo ? "Cambiar logo" : "Subir logo"}
          </button>
          <span className="text-xs text-text-faint">PNG, JPG o WEBP -- máximo 2MB</span>
        </div>
      </div>
      {uploadMutation.isError && (
        <p role="alert" className="aura-alert">
          {(uploadMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}

export function CompanyProfileForm() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["tenantProfile"], queryFn: getTenantProfile });

  const [name, setName] = useState("");
  const [cuit, setCuit] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [taxStatus, setTaxStatus] = useState<CustomerTaxStatus | "">("");

  // Sincroniza el form con la respuesta del server la primera vez que
  // llega (y si se refetchea desde afuera) -- mismo patrón que
  // editingProduct/editingCustomer en los otros forms, pero acá no hay
  // "modo alta" porque el Tenant siempre existe.
  useEffect(() => {
    if (!profileQuery.data) return;
    setName(profileQuery.data.name);
    setCuit(profileQuery.data.cuit ?? "");
    setAddress(profileQuery.data.address ?? "");
    setPhone(profileQuery.data.phone ?? "");
    setBusinessEmail(profileQuery.data.business_email ?? "");
    setTaxStatus(profileQuery.data.tax_status ?? "");
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTenantProfile({
        name,
        cuit: cuit || null,
        address: address || null,
        phone: phone || null,
        business_email: businessEmail || null,
        tax_status: taxStatus || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantProfile"] });
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="aura-card">
        <p className="text-sm text-text-dim">Cargando...</p>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="aura-card">
        <p role="alert" className="aura-alert">
          {(profileQuery.error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="aura-card flex flex-col gap-4"
    >
      <h2>Datos de la empresa</h2>
      <p className="text-sm text-text-dim">
        Esta información se va a mostrar en los comprobantes, presupuestos y notas de pedido.
      </p>

      <LogoUploader hasLogo={profileQuery.data?.has_logo ?? false} />

      <label className="aura-label">
        Razón social
        <input value={name} onChange={(e) => setName(e.target.value)} required className="aura-input" />
      </label>

      <label className="aura-label">
        CUIT
        <input value={cuit} onChange={(e) => setCuit(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Situación fiscal
        <select
          value={taxStatus}
          onChange={(e) => setTaxStatus(e.target.value as CustomerTaxStatus | "")}
          className="aura-select"
        >
          <option value="">Sin especificar</option>
          {TAX_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="aura-label">
        Dirección
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Teléfono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Email de contacto
        <input
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          className="aura-input"
        />
      </label>

      <button type="submit" disabled={saveMutation.isPending} className="aura-btn-primary self-start">
        {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
      </button>

      {saveMutation.isError && (
        <p role="alert" className="aura-alert">
          {(saveMutation.error as Error).message}
        </p>
      )}
      {saveMutation.isSuccess && <p className="text-sm text-success">Datos actualizados.</p>}
    </form>
  );
}
