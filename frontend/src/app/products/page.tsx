"use client";

import { useState } from "react";

import { ProductForm } from "@/components/ProductForm";
import { ProductsTable } from "@/components/ProductsTable";
import { Button } from "@/components/ui";
import type { ProductRead } from "@/lib/api/types";

type FormTarget = ProductRead | "new" | null;

export default function ProductsPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  return (
    <>
      <h1 className="font-display text-xl font-semibold tracking-tight text-text">
        AuraPro — Productos
      </h1>

      {formTarget === null ? (
        <Button variant="primary" className="self-start" onClick={() => setFormTarget("new")}>
          Nuevo producto
        </Button>
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
