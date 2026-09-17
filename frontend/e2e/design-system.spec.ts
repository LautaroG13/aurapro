import { expect, test } from "@playwright/test";

// Patrón del bug de Vendi: un `\u00XX` literal (texto, no el carácter
// real) filtrándose al HTML que ve el usuario.
const UNESCAPED_UNICODE = /\\u00[0-9a-fA-F]{2}/;

test("la vidriera de componentes no filtra unicode sin escapar", async ({ page }) => {
  await page.goto("/design-system");
  // innerText (no page.content()): el payload RSC de Next trae los
  // strings de las props como literales JS con \uXXXX -- eso es interno
  // y el browser lo decodifica antes de pintar nada, no es lo que ve
  // el usuario. Lo que nos importa es el texto ya renderizado en pantalla.
  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(UNESCAPED_UNICODE);
});

test("PageHeader muestra título, ícono de ayuda y acción", async ({ page }) => {
  await page.goto("/design-system");
  const header = page.getByRole("heading", { name: "Tus productos", exact: true });
  await expect(header).toBeVisible();
  await expect(page.getByTitle("Acá cargás y actualizás todo lo que tenés para vender.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo producto" })).toBeVisible();
});

test("EmptyState muestra título del problema y CTA, nunca un genérico", async ({ page }) => {
  await page.goto("/design-system");
  await expect(page.getByText("Todavía no cargaste ningún producto")).toBeVisible();
  await expect(page.getByText(/^Sin datos\.?$/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cargar tu primer producto" })).toBeVisible();
});

test("PlanBadge renderiza las 4 variantes", async ({ page }) => {
  await page.goto("/design-system");
  const section = page.getByText("PlanBadge — variantes").locator("..");
  await expect(section.getByText("PRO", { exact: true })).toBeVisible();
  await expect(section.getByText("PRO MAX", { exact: true })).toBeVisible();
  await expect(section.getByText("Próximamente", { exact: true })).toBeVisible();
  await expect(section.getByText("3", { exact: true })).toBeVisible();
});
