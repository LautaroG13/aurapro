import { QuoteForm } from "@/components/QuoteForm";
import { QuotesTable } from "@/components/QuotesTable";

export default function QuotesPage() {
  return (
    <>
      <h1>AuraPro — Presupuestos</h1>
      <QuoteForm />
      <QuotesTable />
    </>
  );
}
