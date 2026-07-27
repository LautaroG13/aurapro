import { apiFetch } from "./client";
import type {
  ForgotPasswordRequest,
  InvitationCreate,
  InvitationPreview,
  InvitationRead,
  ResetPasswordRequest,
  SalespersonRead,
  TokenResponse,
  UserRead,
  UserUpdate,
} from "./types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function listSalespeople(): Promise<SalespersonRead[]> {
  return apiFetch<SalespersonRead[]>("/api/v1/auth/salespeople");
}

export async function listUsers(): Promise<UserRead[]> {
  return apiFetch<UserRead[]>("/api/v1/auth/users");
}

export async function updateUser(userId: string, payload: UserUpdate): Promise<UserRead> {
  return apiFetch<UserRead>(`/api/v1/auth/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/auth/users/${userId}`, { method: "DELETE" });
}

// Sin auth: se llaman antes de que la persona tenga una sesión.
export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  return apiFetch<void>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(token: string, payload: ResetPasswordRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>(`/api/v1/auth/reset-password/${token}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listInvitations(): Promise<InvitationRead[]> {
  return apiFetch<InvitationRead[]>("/api/v1/auth/invitations");
}

export async function createInvitation(payload: InvitationCreate): Promise<InvitationRead> {
  return apiFetch<InvitationRead>("/api/v1/auth/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Sin auth: se llama desde la página pública /invite/[token], antes de
// que el invitado tenga cuenta o token.
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiFetch<InvitationPreview>(`/api/v1/auth/invitations/${token}`);
}

export async function acceptInvitation(token: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>(`/api/v1/auth/invitations/${token}/accept`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}
