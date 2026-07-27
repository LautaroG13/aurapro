import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

// Variables consumidas por --font-display/--font-body/--font-mono en
// app/globals.css (sección "Sistema de diseño dark mode"). Cargadas acá
// (no en el componente) porque next/font/google exige que la llamada
// viva en un módulo de nivel superior.
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
