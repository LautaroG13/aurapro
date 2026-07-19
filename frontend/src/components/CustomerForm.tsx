"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { listSalespeople } from "@/lib/api/auth";
import { createCustomer, createCustomerType, listCustomerTypes, updateCustomer } from "@/lib/api/customers";
import type { CustomerRead } from "@/lib/api/types";

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

  const [isCreatingType, setIsCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

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
      };
      return editingCustomer ? updateCustomer(editingCustomer.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: () => createCustomerType({ name: newTypeName }),
    onSuccess: (createdType) => {
      queryClient.invalidateQueries({ queryKey: ["customerTypes"] });
      setCustomerTypeId(createdType.id);
      setNewTypeName("");
      setIsCreatingType(false);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="aura-card flex flex-col gap-4"
    >
      <h2>{editingCustomer ? "Editar cliente" : "Nuevo cliente"}</h2>

      <label className="aura-label">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} required className="aura-input" />
      </label>

      <label className="aura-label">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Teléfono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Dirección
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="aura-input" />
      </label>

      <label className="aura-label">
        Límite de crédito
        <input
          type="number"
          min="0"
          step="0.01"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          className="aura-input"
        />
      </label>

      <label className="aura-label">
        Vendedor default
        <select
          value={defaultSalespersonId}
          onChange={(e) => setDefaultSalespersonId(e.target.value)}
          className="aura-input"
        >
          <option value="">Sin asignar</option>
          {salespeopleQuery.data?.map((salesperson) => (
            <option key={salesperson.id} value={salesperson.id}>
              {salesperson.email}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <label className="aura-label">
          Tipo de cliente
          <select
            value={customerTypeId}
            onChange={(e) => setCustomerTypeId(e.target.value)}
            className="aura-input"
          >
            <option value="">Sin tipo</option>
            {customerTypesQuery.data?.map((customerType) => (
              <option key={customerType.id} value={customerType.id}>
                {customerType.name}
              </option>
            ))}
          </select>
        </label>

        {isCreatingType ? (
          <div className="flex gap-2">
            <input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Nombre del tipo (ej. Mayorista)"
              className="aura-input"
            />
            <button
              type="button"
              disabled={createTypeMutation.isPending || newTypeName.trim() === ""}
              onClick={() => createTypeMutation.mutate()}
              className="aura-btn-primary px-3 py-1"
            >
              {createTypeMutation.isPending ? "Creando..." : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingType(false);
                setNewTypeName("");
              }}
              className="aura-btn-secondary px-3 py-1"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingType(true)}
            className="aura-btn-secondary self-start px-2 py-1 text-sm"
          >
            + Nuevo tipo
          </button>
        )}

        {createTypeMutation.isError && (
          <p role="alert" className="aura-alert">
            {(createTypeMutation.error as Error).message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saveMutation.isPending} className="aura-btn-primary self-start">
          {saveMutation.isPending ? "Guardando..." : editingCustomer ? "Guardar cambios" : "Crear cliente"}
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
    </form>
  );
}
