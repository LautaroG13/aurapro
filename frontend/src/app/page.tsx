import { StockAlert } from "@/components/StockAlert";
import { SystemMonitor } from "@/components/SystemMonitor";

export default function HomePage() {
  return (
    <>
      <h1>AuraPro</h1>
      <StockAlert tenantId="tenant-1" productId="sku-1" />
      <SystemMonitor />
    </>
  );
}
