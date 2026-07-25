"use client";

import { useParams } from "next/navigation";

import { AcceptInvitationForm } from "@/components/team/AcceptInvitationForm";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  return <AcceptInvitationForm token={params.token} />;
}
