import { apiFetch } from "./client";
import type { SalespersonRead, TokenResponse } from "./types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function listSalespeople(): Promise<SalespersonRead[]> {
  return apiFetch<SalespersonRead[]>("/api/v1/auth/salespeople");
}
