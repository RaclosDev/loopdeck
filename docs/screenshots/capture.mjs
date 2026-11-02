import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(
  new URL("../../frontend/package.json", import.meta.url),
);
const { chromium, expect } = require("@playwright/test");
const output = fileURLToPath(new URL("./", import.meta.url));
const origin = "http://127.0.0.1:3000";
const decks = [
  {
    id: "biology",
    name: "Biología celular",
    description: "De la célula a los tejidos",
  },
  {
    id: "english",
    name: "Inglés · Vocabulario",
    description: "Un poco cada día",
  },
  {
    id: "history",
    name: "Historia del arte",
    description: "Obras, épocas y autores",
  },
].map((deck) => ({
  ...deck,
  userId: "showcase",
  parentId: null,
  presetId: null,
  createdAt: "2026-11-03",
}));
const counts = {
  biology: {
    newCount: 4,
    learningCount: 2,
    reviewCount: 3,
    totalCount: 36,
    noteCount: 36,
  },
  english: {
    newCount: 3,
    learningCount: 0,
    reviewCount: 5,
    totalCount: 64,
    noteCount: 64,
  },
  history: {
    newCount: 0,
    learningCount: 0,
    reviewCount: 0,
    totalCount: 28,
    noteCount: 28,
  },
};
const items = [
  [
    "¿Qué función tienen las mitocondrias?",
    "Producen la mayor parte del **ATP** de la célula mediante la respiración celular.",
  ],
  [
    "¿Qué contiene el núcleo celular?",
    "El **ADN**, que almacena la información genética.",
  ],
].map(([front, back], index) => ({
  note: {
    id: `note-${index}`,
    deckId: "biology",
    userId: "showcase",
    noteType: "basic",
    fieldsJson: JSON.stringify({ front, back }),
    tags: "biología",
  },
  card: {
    id: `card-${index}`,
    noteId: `note-${index}`,
    state: "new",
    cardOrdinal: 0,
    intervalDays: 0,
    easeFactor: 2.5,
  },
  intervals: { 1: "1m", 2: "6m", 3: "10m", 4: "4d" },
}));

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const unexpected = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    // Unsigned, local-only fixture; never sent to a backend.
    const payload = btoa(
      JSON.stringify({
        sub: "showcase",
        name: "Alex",
        email: "demo@example.invalid",
        exp: 4102444800,
      }),
    );
    localStorage.setItem("loopdeck_jwt_token", `e30.${payload}.fixture`);
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.slice(4);
      let body;
      if (path === "/decks") body = decks;
      else if (path === "/decks/stats") body = counts;
      else if (path === "/auth/config") body = { googleClientId: "CHANGE_ME" };
      else if (path === "/version") body = { version: "demo" };
      else if (path === "/study/prepare") body = {};
      else if (path === "/decks/biology/study/batch")
        body = { items, counts: counts.biology, hasMore: false };
      else if (path.endsWith("/document/info")) body = { hasDocument: false };
      else {
        unexpected.push(path);
        return route.fulfill({
          status: 501,
          json: { message: "Missing screenshot fixture" },
        });
      }
      return route.fulfill({ json: body });
    }
    if (url.origin !== origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => unexpected.push(error.message));
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `${output}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.goto(origin);
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText("36 tarjetas", { exact: true })).toBeVisible();
  await capture("decks-desktop");
  await page.goto(origin + "/hub/biology");
  await expect(
    page.getByRole("heading", { name: "Cómo quieres estudiar" }),
  ).toBeVisible();
  await capture("study-hub");
  await page.goto(`${origin}/study/biology`);
  await page
    .getByRole("button", { name: "Mostrar Respuesta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tarjeta volteada" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await capture("study-mobile");
  if (unexpected.length)
    throw new Error(`Unexpected requests/errors: ${unexpected.join(", ")}`);
  console.log(
    "Captured desktop decks and desktop/mobile study with local fixtures.",
  );
} finally {
  await browser.close();
}
