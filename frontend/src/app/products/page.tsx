"use client";

import { useState } from "react";

import { ProductForm } from "@/components/ProductForm";
import { ProductsTable } from "@/components/ProductsTable";
import { Button, PageHeader } from "@/components/ui";
import type { ProductRead } from "@/lib/api/types";
import { useCanWrite } from "@/lib/currentUserContext";

type FormTarget = ProductRead | "new" | null;

export default function ProductsPage() {
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const canWrite = useCanWrite();

  return (
    <>
      <PageHeader
        title="Tus productos"
        subtitle="El catálogo que vendés: precios, stock y variantes en un solo lugar."
        helpText="Acá cargás y actualizás todo lo que tenés para vender. El stock se descuenta solo con cada venta."
        actions={
          formTarget === null && canWrite ? (
            <Button variant="primary" onClick={() => setFormTarget("new")}>
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      {formTarget !== null && (
        <ProductForm
          key={formTarget === "new" ? "new" : formTarget.id}
          editingProduct={formTarget === "new" ? null : formTarget}
          onDone={() => setFormTarget(null)}
        />
      )}

      <ProductsTable onEdit={(product) => setFormTarget(product)} onCreate={() => setFormTarget("new")} />
    </>
  );
}
