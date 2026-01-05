import { test, expect } from "@playwright/test";

test("carrega el mapa i la UI base", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("svg.map");
  const count = await page.locator("path.comarca").count();
  expect(count).toBeGreaterThan(30);
  await expect(page.getByRole("button", { name: /Nova partida/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Diari/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Setmanal/i })).toBeVisible();
});

test("nova partida neteja el camp de text", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("svg.map");
  const input = page.locator("#guess-input");
  await input.fill("Alt");
  await expect(input).toHaveValue("Alt");
  await page.getByRole("button", { name: /Nova partida/i }).click();
  await expect(input).toHaveValue("");
});

test("el calendari s'obre des del botó diari", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Diari/i }).click();
  await expect(page.locator(".calendar-panel")).toBeVisible();
});
