"use client";

import { useParams } from "next/navigation";

import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  return <ResetPasswordForm token={params.token} />;
}
