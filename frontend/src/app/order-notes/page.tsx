import { OrderNoteForm } from "@/components/OrderNoteForm";
import { OrderNotesTable } from "@/components/OrderNotesTable";

export default function OrderNotesPage() {
  return (
    <>
      <h1>AuraPro — Notas de pedido</h1>
      <OrderNoteForm />
      <OrderNotesTable />
    </>
  );
}
