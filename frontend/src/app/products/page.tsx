"use client";

import { useState } from "react";

import { ProductForm } from "@/components/ProductForm";
import { ProductsTable } from "@/components/ProductsTable";
import type { ProductRead } from "@/lib/api/types";

type FormTarget = ProductRead | "new" | null;

export default function ProductsPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  return (
    <>
      <h1>AuraPro — Productos</h1>

      {formTarget === null ? (
        <button
          type="button"
          onClick={() => setFormTarget("new")}
          className="aura-btn-primary self-start"
        >
          Nuevo producto
        </button>
      ) : (
        <ProductForm
          key={formTarget === "new" ? "new" : formTarget.id}
          editingProduct={formTarget === "new" ? null : formTarget}
          onDone={() => setFormTarget(null)}
        />
      )}

      <ProductsTable onEdit={(product) => setFormTarget(product)} />
    </>
  );
}
