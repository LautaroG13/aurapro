import "./globals.css";
import type { ReactNode } from "react";

import { QueryProvider } from "@/lib/query-provider";

export const metadata = {
  title: "AuraPro",
  description: "AuraPro frontend",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
