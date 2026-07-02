import Link from "next/link";

import { StockAlert } from "@/components/StockAlert";
import { SystemMonitor } from "@/components/SystemMonitor";

export default function HomePage() {
  return (
    <main>
      <h1>AuraPro</h1>
      <p>
        <Link href="/sales">Ir a Ventas →</Link> · <Link href="/admin">Consola SuperAdmin →</Link>
      </p>
      <StockAlert tenantId="tenant-1" productId="sku-1" />
      <SystemMonitor />
    </main>
  );
}
