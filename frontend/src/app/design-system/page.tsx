import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Button, Card, DataTable, Input, Select, StatCard, StatusDot } from "@/components/ui";

const SAMPLE_PRODUCTS = [
  { name: 'Taladro percutor 1/2" 750W', sku: "TLD-750-BK", status: "ok" as const, stock: 42, price: "$89.900" },
  { name: 'Amoladora angular 4½"', sku: "AMG-045-RD", status: "low" as const, stock: 3, price: "$54.300" },
  { name: "Set de llaves combinadas 12pz", sku: "LLC-012-SET", status: "out" as const, stock: 0, price: "$37.150" },
  { name: "Guantes de trabajo reforzados", sku: "GNT-REF-L", status: "ok" as const, stock: 120, price: "$6.400" },
];

const STATUS_LABEL: Record<(typeof SAMPLE_PRODUCTS)[number]["status"], string> = {
  ok: "Disponible",
  low: "Stock bajo",
  out: "Sin stock",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="font-display text-[14.5px] font-semibold text-text">{title}</h2>
      {children}
    </Card>
  );
}

/**
 * Vidriera de componentes del sistema de diseño dark mode (Fase 1).
 * Solo dev -- no forma parte de la navegación de la app real, es para
 * revisar visualmente antes de aprobar la migración de módulos
 * (Fase 2).
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg p-8 font-body text-text">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-text">
            AuraPro — Sistema de diseño (dark mode)
          </h1>
          <p className="mt-1 text-sm text-text-dim">
            Fase 1 — solo componentes base, ninguna página real usa esto todavía.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3.5">
          <StatCard label="Ventas del mes" value="$4.812.300" delta="↑ 12.4% vs mes anterior" deltaDirection="up" />
          <StatCard
            label="Productos con stock bajo"
            value="18"
            delta="↑ 3 desde ayer"
            deltaDirection="down"
          />
          <StatCard label="Cuentas por cobrar" value="$912.400" delta="7 clientes vencidos" />
          <StatCard label="Órdenes de compra abiertas" value="5" delta="2 con recepción parcial" />
        </div>

        <Section title="Stock de productos (DataTable)">
          <div className="overflow-x-auto">
            <DataTable.Root>
              <DataTable.Head>
                <DataTable.Row className="hover:bg-transparent">
                  <DataTable.HeaderCell>Producto</DataTable.HeaderCell>
                  <DataTable.HeaderCell>SKU</DataTable.HeaderCell>
                  <DataTable.HeaderCell>Estado</DataTable.HeaderCell>
                  <DataTable.HeaderCell align="right">Stock</DataTable.HeaderCell>
                  <DataTable.HeaderCell align="right">Precio</DataTable.HeaderCell>
                </DataTable.Row>
              </DataTable.Head>
              <DataTable.Body>
                {SAMPLE_PRODUCTS.map((product) => (
                  <DataTable.Row key={product.sku}>
                    <DataTable.Cell>{product.name}</DataTable.Cell>
                    <DataTable.Cell className="font-mono text-[12.5px] text-text-dim">
                      {product.sku}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={product.status} />
                        {STATUS_LABEL[product.status]}
                      </span>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{product.stock}</DataTable.Cell>
                    <DataTable.Cell numeric>{product.price}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable.Body>
            </DataTable.Root>
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-4">
          <Section title="Variantes de botones">
            <div className="flex flex-wrap gap-2.5">
              <Button variant="primary">Guardar cambios</Button>
              <Button variant="secondary">Cancelar</Button>
              <Button variant="ghost">Ver historial</Button>
              <Button variant="danger">Eliminar producto</Button>
              <Button variant="primary" disabled>
                Deshabilitado
              </Button>
            </div>
          </Section>

          <Section title="Formulario — Nuevo producto">
            <div className="grid grid-cols-2 gap-3.5">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
                Nombre
                <Input placeholder="Ej: Taladro percutor" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
                SKU
                <Input className="font-mono" placeholder="TLD-750-BK" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
                Categoría
                <Select defaultValue="">
                  <option value="" disabled>
                    Elegí una categoría
                  </option>
                  <option>Herramientas eléctricas</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
                Precio
                <Input className="font-mono" placeholder="$ 0,00" />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5 text-xs font-medium text-text-dim">
                Campo con error
                <Input error defaultValue="Valor inválido" />
              </label>
            </div>
          </Section>
        </div>

        <Section title="StatusDot — los 3 estados">
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <StatusDot status="ok" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <StatusDot status="low" /> Stock bajo
            </span>
            <span className="flex items-center gap-1.5">
              <StatusDot status="out" /> Sin stock
            </span>
          </div>
        </Section>
      </div>
    </div>
  );
}
