"use client";

import { useState } from "react";

import { CustomerForm } from "@/components/CustomerForm";
import { CustomersTable } from "@/components/CustomersTable";
import type { CustomerRead } from "@/lib/api/types";

type FormTarget = CustomerRead | "new" | null;

export default function CustomersPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  return (
    <>
      <h1>AuraPro — Clientes</h1>

      {formTarget === null ? (
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="aura-btn-primary self-start"
        >
          Nuevo cliente
        </button>
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
