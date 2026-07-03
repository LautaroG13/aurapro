import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { CreateTenantForm } from "@/components/admin/CreateTenantForm";
import { GlobalStatsPanel } from "@/components/admin/GlobalStatsPanel";
import { TenantsTable } from "@/components/admin/TenantsTable";

export default function AdminPage() {
  return (
    <>
      <h1>AuraPro — Consola SuperAdmin</h1>
      <AdminAuthGuard>
        <GlobalStatsPanel />
        <CreateTenantForm />
        <TenantsTable />
      </AdminAuthGuard>
    </>
  );
}
