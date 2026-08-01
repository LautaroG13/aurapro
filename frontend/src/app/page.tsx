import { SystemMonitor } from "@/components/SystemMonitor";

// StockAlert existía acá antes con un productId hardcodeado
// ("sku-1") que no corresponde a ningún producto real -- la home no
// tiene un "producto actual" del que mostrar pronóstico, así que
// mostraba un 404 permanente en vez de algo útil. El componente sigue
// disponible en components/StockAlert.tsx para usarlo donde sí haya
// un producto real en contexto (ej. una futura vista de detalle).
export default function HomePage() {
  return (
    <>
      <h1>AuraPro</h1>
      <SystemMonitor />
    </>
  );
}
