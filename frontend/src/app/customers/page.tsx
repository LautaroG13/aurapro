"use client";

import { useState } from "react";

import { CustomerForm } from "@/components/CustomerForm";
import { CustomersTable } from "@/components/CustomersTable";
import { Button, PageHeader } from "@/components/ui";
import type { CustomerRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

type FormTarget = CustomerRead | "new" | null;

export default function CustomersPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const canWrite = useCanWrite();

  return (
    <>
      <PageHeader
        title="Tus clientes"
        subtitle="Sus datos de contacto y su cuenta corriente, siempre a mano."
        helpText="Acá cargás a quién le vendés: para facturar más rápido y llevar el saldo que te deben."
        actions={
          formTarget === null && canWrite ? (
            <Button variant="primary" onClick={() => setFormTarget("new")}>
              Nuevo cliente
            </Button>
          ) : undefined
        }
      />

      {formTarget !== null && (
        <CustomerForm
          key={formTarget === "new" ? "new" : formTarget.id}
          editingCustomer={formTarget === "new" ? null : formTarget}
          onDone={() => setFormTarget(null)}
        />
      )}

      <CustomersTable onEdit={(customer) => setFormTarget(customer)} onCreate={() => setFormTarget("new")} />
    </>
  );
}
