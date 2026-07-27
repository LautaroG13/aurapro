import { SaleForm } from "@/components/SaleForm";
import { SalesTable } from "@/components/SalesTable";

export default function SalesPage() {
  return (
    <>
      <h1>AuraPro — Ventas</h1>
      <SaleForm />
      <SalesTable />
    </>
  );
}
