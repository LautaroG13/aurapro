"use client";

import { createContext, useContext } from "react";

interface CurrentUserContextValue {
  role: string | null;
  isAdmin: boolean;
  isSuperadmin: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  role: null,
  isAdmin: false,
  isSuperadmin: false,
});

export const CurrentUserProvider = CurrentUserContext.Provider;

// El backend es la autoridad real (WRITE_ROLES = ADMIN|VENDEDOR en
// cada router) -- esto es solo para no mostrarle a un VIEWER un botón
// que sabemos de antemano que el backend va a rechazar con 403.
export function useCanWrite(): boolean {
  const { role } = useContext(CurrentUserContext);
  return role === "ADMIN" || role === "VENDEDOR";
}

export function useCurrentUserRole(): CurrentUserContextValue {
  return useContext(CurrentUserContext);
}
