"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import { listSalespeople } from "@/lib/api/auth";
import { createCustomer, createCustomerType, listCustomerTypes, updateCustomer } from "@/lib/api/customers";
import type { CustomerRead, CustomerTaxStatus } from "@/lib/api/types";

import { CustomerAccount } from "./CustomerAccount";

const TAX_STATUSES: CustomerTaxStatus[] = ["RESPONSABLE_INSCRIPTO", "MONOTRIBUTO", "EXENTO"];

interface CustomerFormProps {
  editingCustomer: CustomerRead | null;
  onDone: () => void;
}

export function CustomerForm({ editingCustomer, onDone }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editingCustomer?.name ?? "");
  const [email, setEmail] = useState(editingCustomer?.email ?? "");
  const [phone, setPhone] = useState(editingCustomer?.phone ?? "");
  const [address, setAddress] = useState(editingCustomer?.address ?? "");
  const [creditLimit, setCreditLimit] = useState(
    editingCustomer?.credit_limit != null ? String(editingCustomer.credit_limit) : ""
  );
  const [defaultSalespersonId, setDefaultSalespersonId] = useState(
    editingCustomer?.default_salesperson_id ?? ""
  );
  const [customerTypeId, setCustomerTypeId] = useState(editingCustomer?.customer_type_id ?? "");
  const [cuit, setCuit] = useState(editingCustomer?.cuit ?? "");
  const [taxStatus, setTaxStatus] = useState<CustomerTaxStatus | "">(editingCustomer?.tax_status ?? "");

  const [isCreatingType, setIsCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeIsWholesale, setNewTypeIsWholesale] = useState(false);

  const salespeopleQuery = useQuery({ queryKey: ["salespeople"], queryFn: listSalespeople });
  const customerTypesQuery = useQuery({ queryKey: ["customerTypes"], queryFn: listCustomerTypes });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        credit_limit: creditLimit ? Number(creditLimit) : null,
        default_salesperson_id: defaultSalespersonId || null,
        customer_type_id: customerTypeId || null,
        cuit: cuit || null,
        tax_status: taxStatus || null,
      };
      return editingCustomer ? updateCustomer(editingCustomer.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: () => createCustomerType({ name: newTypeName, is_wholesale: newTypeIsWholesale }),
    onSuccess: (createdType) => {
      queryClient.invalidateQueries({ queryKey: ["customerTypes"] });
      setCustomerTypeId(createdType.id);
      setNewTypeName("");
      setNewTypeIsWholesale(false);
      setIsCreatingType(false);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="flex flex-col gap-4 rounded-base border border-border bg-surface p-5"
    >
      <h2 className="font-display text-[14.5px] font-semibold text-text">
        {editingCustomer ? "Editar cliente" : "Nuevo cliente"}
      </h2>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Nombre
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Email
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Teléfono
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Dirección
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        CUIT
        <Input className="font-mono" value={cuit} onChange={(e) => setCuit(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Situación fiscal
        <Select value={taxStatus} onChange={(e) => setTaxStatus(e.target.value as CustomerTaxStatus | "")}>
          <option value="">Sin especificar</option>
          {TAX_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Límite de crédito
        <Input
          className="font-mono"
          type="number"
          min="0"
          step="0.01"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
        Vendedor default
        <Select value={defaultSalespersonId} onChange={(e) => setDefaultSalespersonId(e.target.value)}>
          <option value="">Sin asignar</option>
          {salespeopleQuery.data?.map((salesperson) => (
            <option key={salesperson.id} value={salesperson.id}>
              {salesperson.email}
            </option>
          ))}
        </Select>
      </label>
      {salespeopleQuery.isError && (
        <p className="text-xs text-danger">
          No se pudo cargar la lista de vendedores: {(salespeopleQuery.error as Error).message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
          Tipo de cliente
          <Select value={customerTypeId} onChange={(e) => setCustomerTypeId(e.target.value)}>
            <option value="">Sin tipo</option>
            {customerTypesQuery.data?.map((customerType) => (
              <option key={customerType.id} value={customerType.id}>
                {customerType.name}
                {customerType.is_wholesale ? " (mayorista)" : ""}
              </option>
            ))}
          </Select>
        </label>
        {customerTypesQuery.isError && (
          <p className="text-xs text-danger">
            No se pudieron cargar los tipos de cliente: {(customerTypesQuery.error as Error).message}
          </p>
        )}

        {isCreatingType ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Nombre del tipo (ej. Mayorista)"
              />
              <Button
                type="button"
                variant="primary"
                className="px-3 py-1"
                disabled={createTypeMutation.isPending || newTypeName.trim() === ""}
                onClick={() => createTypeMutation.mutate()}
              >
                {createTypeMutation.isPending ? "Creando..." : "Crear"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-1"
                onClick={() => {
                  setIsCreatingType(false);
                  setNewTypeName("");
                  setNewTypeIsWholesale(false);
                }}
              >
                Cancelar
              </Button>
            </div>
            <label className="flex items-center gap-2 font-body text-[13px] font-medium text-text">
              <input
                type="checkbox"
                checked={newTypeIsWholesale}
                onChange={(e) => setNewTypeIsWholesale(e.target.checked)}
              />
              Es mayorista (los clientes de este tipo pagan el precio mayorista de los productos que lo tengan)
            </label>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="self-start px-2 py-1 text-xs"
            onClick={() => setIsCreatingType(true)}
          >
            + Nuevo tipo
          </Button>
        )}

        {createTypeMutation.isError && (
          <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {(createTypeMutation.error as Error).message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="self-start" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Guardando..." : editingCustomer ? "Guardar cambios" : "Crear cliente"}
        </Button>
        <Button type="button" variant="secondary" className="self-start" onClick={onDone}>
          Cancelar
        </Button>
      </div>

      {saveMutation.isError && (
        <p role="alert" className="rounded-base border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {(saveMutation.error as Error).message}
        </p>
      )}

      {editingCustomer && <CustomerAccount customer={editingCustomer} />}
    </form>
  );
}
