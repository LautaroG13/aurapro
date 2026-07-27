"use client";

import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { TeamAuthGuard } from "@/components/team/TeamAuthGuard";

export default function IntegrationsPage() {
  return (
    <TeamAuthGuard>
      <h1>AuraPro — Integraciones</h1>
      <IntegrationsPanel />
    </TeamAuthGuard>
  );
}
