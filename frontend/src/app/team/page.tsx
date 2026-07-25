"use client";

import { InviteUserForm } from "@/components/team/InviteUserForm";
import { TeamAuthGuard } from "@/components/team/TeamAuthGuard";
import { TeamMembersTable } from "@/components/team/TeamMembersTable";

export default function TeamPage() {
  return (
    <TeamAuthGuard>
      <h1>AuraPro — Equipo</h1>
      <InviteUserForm />
      <TeamMembersTable />
    </TeamAuthGuard>
  );
}
