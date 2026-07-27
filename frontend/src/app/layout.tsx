import "./globals.css";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { inter, jetbrainsMono, spaceGrotesk } from "@/lib/fonts";
import { QueryProvider } from "@/lib/query-provider";

export const metadata = {
  title: "AuraPro",
  description: "AuraPro frontend",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Las 3 variables de fuente quedan disponibles en todo el árbol vía
    // --font-space-grotesk/--font-inter/--font-jetbrains-mono (usadas
    // por --font-display/body/mono en globals.css) -- agregar las
    // clases acá no cambia nada visualmente todavía porque ninguna
    // página existente usa las utilidades font-display/font-body/
    // font-mono, solo components/ui/* y /design-system.
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <QueryProvider>
          <AppLayout>{children}</AppLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
