import { test, expect } from "@playwright/test";

const getTodayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

test("carrega el mapa i la UI base", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("svg.map");
  const count = await page.locator("path.comarca").count();
  expect(count).toBeGreaterThan(30);
  await expect(
    page.getByRole("button", { name: /Jugar al problema d'avui/i })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Jugar al problema d'aquesta setmana/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Calendari/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Esbrina/i })).toBeVisible();
});

test("inicia el nivell diari", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rumb-mode", "normal");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar al problema d'avui/i }).click();
  await page.waitForFunction(() => localStorage.getItem("rumb-mode") === "daily");
});

test("inicia el nivell setmanal", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rumb-mode", "normal");
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /Jugar al problema d'aquesta setmana/i })
    .click();
  await page.waitForFunction(() => localStorage.getItem("rumb-mode") === "weekly");
});

test("obre el modal si el nivell ja està completat", async ({ page }) => {
  const dayKey = getTodayKey();
  await page.addInitScript((key) => {
    const record = {
      levelKey: `daily:${key}`,
      dayKey: key,
      mode: "daily",
      attemptsList: [
        {
          attempts: 3,
          timeMs: 12345,
          playerPath: [{ id: "alt-camp", name: "Alt Camp" }],
          shortestPath: ["Alt Camp", "Barcelonès"],
          shortestCount: 2
        }
      ],
      winningAttempt: {
        attempts: 3,
        timeMs: 12345,
        playerPath: [{ id: "alt-camp", name: "Alt Camp" }],
        shortestPath: ["Alt Camp", "Barcelonès"],
        shortestCount: 2
      },
      shortestPath: ["Alt Camp", "Barcelonès"],
      shortestCount: 2
    };
    localStorage.setItem(
      "rumb-completion-records-v1",
      JSON.stringify({ [`daily:${key}`]: record })
    );
  }, dayKey);
  await page.goto("/");
  await page.getByRole("button", { name: /Jugar al problema d'avui/i }).click();
  await expect(page.locator(".modal")).toBeVisible();
});

test("la configuració es persisteix", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Opcions/i }).click();
  await page.getByRole("button", { name: /Configuració/i }).click();
  await page.getByRole("button", { name: /Mar Blava/i }).click();
  await page.getByRole("button", { name: /Tanca/i }).click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("rumb-settings-v1");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return parsed.theme === "mar";
    } catch {
      return false;
    }
  });
  await page.reload();
  const theme = await page.evaluate(() => {
    const raw = localStorage.getItem("rumb-settings-v1");
    return raw ? JSON.parse(raw).theme : null;
  });
  expect(theme).toBe("mar");
});
