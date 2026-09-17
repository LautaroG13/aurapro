import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

// En algunos entornos de dev/CI ya hay un Chromium pre-instalado en una
// versión distinta a la que espera @playwright/test (que si no,
// intentaría descargar una build nueva). Si existe ese binario, lo
// usamos directamente; si no, Playwright resuelve el suyo como siempre.
const PINNED_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const chromiumExecutablePath = existsSync(PINNED_CHROMIUM) ? PINNED_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
  },
  webServer: {
    // /design-system es dev-only (devuelve notFound() en producción), así
    // que estos tests corren contra el dev server, no un build de prod.
    command: "npx next dev -p 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {},
      },
    },
  ],
});
