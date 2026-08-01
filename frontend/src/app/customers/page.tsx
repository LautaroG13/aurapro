"use client";

import { useState } from "react";

import { CustomerForm } from "@/components/CustomerForm";
import { CustomersTable } from "@/components/CustomersTable";
import { Button } from "@/components/ui";
import type { CustomerRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

type FormTarget = CustomerRead | "new" | null;

export default function CustomersPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const canWrite = useCanWrite();

  return (
    <>
      <h1 className="font-display text-xl font-semibold tracking-tight text-text">AuraPro — Clientes</h1>

      {formTarget === null ? (
        canWrite && (
          <Button variant="primary" className="self-start" onClick={() => setFormTarget("new")}>
            Nuevo cliente
          </Button>
        )
      ) : (
        <CustomerForm
          key={formTarget === "new" ? "new" : formTarget.id}
          editingCustomer={formTarget === "new" ? null : formTarget}
          onDone={() => setFormTarget(null)}
        />
      )}

      <CustomersTable onEdit={(customer) => setFormTarget(customer)} />
    </>
  );
}
