"use client";

import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { TeamAuthGuard } from "@/components/team/TeamAuthGuard";

export default function CompanyPage() {
  return (
    <TeamAuthGuard>
      <h1>AuraPro — Empresa</h1>
      <CompanyProfileForm />
    </TeamAuthGuard>
  );
}
