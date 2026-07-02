import { AuthGate } from "@/components/AuthGate";
import { SaleForm } from "@/components/SaleForm";

export default function SalesPage() {
  return (
    <main>
      <h1>AuraPro — Ventas</h1>
      <AuthGate>
        <SaleForm />
      </AuthGate>
    </main>
  );
}
