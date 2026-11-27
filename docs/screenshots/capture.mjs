import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(
  new URL("../../frontend/package.json", import.meta.url),
);
const { chromium, expect } = require("@playwright/test");
const output = fileURLToPath(new URL("./", import.meta.url));
const origin = new URL(process.argv[2] ?? "http://127.0.0.1:3000").origin;

// Retrato de stock de randomuser.me guardado en el repositorio: la captura no depende de la red.
const AVATAR_URL = "https://randomuser.me/api/portraits/men/32.jpg";
const avatar = readFileSync(new URL("./avatar.jpg", import.meta.url));

// Tamaño final de las imágenes del repositorio (la captura se hace a 3× y se reduce).
const FINAL = { width: 860, height: 1864 };

const USER = "u-7f3a2c";
const day = (n) => new Date(Date.UTC(2026, 10, 27) - n * 86_400_000).toISOString();

const decks = [
  {
    id: "bio",
    name: "Biología · La célula",
    description: "Orgánulos, membrana y división celular",
    createdAt: day(62),
  },
  {
    id: "eng",
    name: "Inglés B2 · Phrasal verbs",
    description: "Verbos con partícula y un ejemplo en cada tarjeta",
    createdAt: day(95),
  },
  {
    id: "his",
    name: "Historia de España · Siglo XX",
    description: "Fechas y hechos clave para el examen",
    createdAt: day(41),
  },
  {
    id: "geo",
    name: "Capitales de Europa",
    description: "País y capital, en los dos sentidos",
    createdAt: day(130),
  },
  {
    id: "js",
    name: "JavaScript · Fundamentos",
    description: "Lo básico del lenguaje para entrevistas",
    createdAt: day(18),
  },
].map((deck) => ({ ...deck, userId: USER, parentId: null, presetId: null }));

const counts = {
  bio: { newCount: 8, learningCount: 3, reviewCount: 17, totalCount: 86, noteCount: 74 },
  eng: { newCount: 6, learningCount: 2, reviewCount: 14, totalCount: 124, noteCount: 124 },
  his: { newCount: 5, learningCount: 1, reviewCount: 9, totalCount: 68, noteCount: 68 },
  geo: { newCount: 2, learningCount: 1, reviewCount: 6, totalCount: 88, noteCount: 44 },
  js: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 52, noteCount: 52 },
};

const seeds = {
  bio: [
    ["La {{c1::**mitocondria**}} obtiene energía en forma de {{c2::**ATP**}} mediante la respiración celular."],
    ["Los {{c1::ribosomas}} sintetizan proteínas a partir del {{c2::ARN mensajero}}."],
    ["La fotosíntesis ocurre en los {{c1::cloroplastos}}, que contienen {{c2::clorofila}}."],
    ["El {{c1::núcleo}} guarda el material genético de la célula eucariota."],
    ["¿Qué orgánulo digiere los residuos celulares?", "El **lisosoma**, mediante enzimas hidrolíticas."],
    ["¿En qué se diferencian la célula procariota y la eucariota?", "La procariota no tiene núcleo delimitado por membrana ni orgánulos membranosos."],
    ["¿Qué función tiene el aparato de Golgi?", "Modifica, empaqueta y distribuye proteínas y lípidos."],
    ["¿Qué es la mitosis?", "La división del núcleo que da dos células hijas con la misma dotación genética."],
    ["¿Qué estructura da rigidez a la célula vegetal?", "La pared celular, formada sobre todo por celulosa."],
    ["¿Dónde se sintetizan los lípidos?", "En el retículo endoplasmático liso."],
    ["¿Qué es la respiración celular?", "La oxidación de la glucosa en la mitocondria para obtener ATP, con CO₂ y agua como productos."],
    ["¿Qué tiene de especial el ADN mitocondrial?", "Es circular, se hereda por vía materna y codifica parte de las proteínas de la cadena respiratoria."],
  ],
  eng: [
    ["to put off", "Aplazar. «We had to put off the meeting until Friday.»"],
    ["to run out of", "Quedarse sin algo. «We have run out of coffee.»"],
    ["to look forward to", "Tener ganas de. «I look forward to hearing from you.»"],
    ["to get along with", "Llevarse bien con. «She gets along with her flatmates.»"],
    ["to give up", "Rendirse o dejar un hábito. «He gave up smoking last year.»"],
    ["to bring up", "Sacar un tema; criar. «Don’t bring up politics at dinner.»"],
    ["to come across", "Encontrar por casualidad. «I came across an old photo.»"],
    ["to turn down", "Rechazar; bajar el volumen. «She turned down the offer.»"],
    ["to set up", "Montar o fundar. «They set up a small company.»"],
    ["to carry out", "Llevar a cabo. «The team carried out the survey.»"],
    ["to figure out", "Averiguar, entender. «I can’t figure out this exercise.»"],
    ["to take after", "Parecerse a un familiar. «He takes after his mother.»"],
  ],
  his: [
    ["¿En qué año se proclamó la Segunda República?", "En 1931, el 14 de abril."],
    ["¿Entre qué años transcurrió la Guerra Civil?", "De 1936 a 1939."],
    ["¿Qué fue el Desastre del 98?", "La pérdida de Cuba, Puerto Rico y Filipinas en 1898."],
    ["¿Cuándo se aprobó la Constitución vigente?", "En 1978, por referéndum el 6 de diciembre."],
    ["¿Qué ocurrió el 23 de febrero de 1981?", "Un intento fallido de golpe de Estado en el Congreso."],
    ["¿En qué año entró España en la Comunidad Económica Europea?", "En 1986."],
    ["¿Quién presidió el primer gobierno elegido en las urnas tras la dictadura?", "Adolfo Suárez, tras las elecciones de 1977."],
    ["¿Qué fue la dictadura de Primo de Rivera?", "El régimen militar de 1923 a 1930, bajo Alfonso XIII."],
    ["¿Qué fueron los Pactos de la Moncloa?", "Los acuerdos económicos y políticos de 1977 entre gobierno, partidos y sindicatos."],
    ["¿Qué dos ciudades acogieron grandes eventos en 1992?", "Barcelona, los Juegos Olímpicos, y Sevilla, la Exposición Universal."],
  ],
};

const tagsOf = { bio: "biologia,celula", eng: "ingles,b2", his: "historia,espana" };
const statesCycle = ["review", "learning", "review", "new", "review", "review"];
const notesOf = Object.fromEntries(
  Object.entries(seeds).map(([deckId, list]) => [
    deckId,
    list.map((seed, index) => ({
      id: `${deckId}-n${index + 1}`,
      userId: USER,
      deckId,
      noteType: seed.length === 1 ? "cloze" : "basic",
      fieldsJson: JSON.stringify(
        seed.length === 1 ? { text: seed[0] } : { front: seed[0], back: seed[1] },
      ),
      tags: tagsOf[deckId],
      createdAt: day(60 - index),
      updatedAt: day(30 - index),
    })),
  ]),
);
const stateOf = (index) => statesCycle[index % statesCycle.length];

// Lote de repaso de Biología: empieza por una tarjeta de huecos ya vista antes.
const studyItems = notesOf.bio.slice(0, 6).map((note, index) => ({
  note,
  card: {
    id: `bio-c${index + 1}`,
    noteId: note.id,
    cardOrdinal: 0,
    state: index === 0 ? "review" : stateOf(index),
    due: day(1),
    intervalDays: index === 0 ? 9 : 3,
    easeFactor: 2.5,
    repetitions: index === 0 ? 4 : 2,
    lapses: 0,
    learningStep: 0,
    suspended: false,
    buried: false,
    flagColor: null,
    leech: false,
    createdAt: note.createdAt,
  },
  intervals: index === 0 ? { 1: "10m", 2: "11d", 3: "23d", 4: "32d" } : { 1: "1m", 2: "6m", 3: "10m", 4: "4d" },
}));

const tutorQuestion = "¿Por qué la mitocondria es la central energética?";
const tutorFollowUp = "¿Y el ciclo de Krebs?";
const tutorAnswer = [
  "Porque ahí se obtiene casi toda la energía que usa la célula, en forma de **ATP**.",
  "",
  "Lo hace con la **respiración celular**: la glucosa se oxida y la cadena respiratoria usa el oxígeno para fabricar ATP, dejando CO₂ y agua.",
  "",
  "Por eso las células que gastan mucha energía, como las musculares, tienen más mitocondrias.",
].join("\n");

function apiResponse(method, path, query, body) {
  if (path === "/decks") return decks;
  if (path === "/decks/stats") return counts;
  if (path === "/auth/config") return { googleClientId: "CHANGE_ME" };
  if (path === "/version") return { version: "2026.11.27" };
  if (path === "/study/prepare") {
    const ids = JSON.parse(body || "{}").deckIds ?? [];
    return Object.fromEntries(
      ids
        .filter((id) => id === "bio")
        .map((id) => [
          id,
          { batch: { items: studyItems, counts: counts.bio, hasMore: true }, validForMs: 60_000 },
        ]),
    );
  }
  if (path === "/decks/bio/study/batch")
    return { items: studyItems, counts: counts.bio, hasMore: true };
  if (path === "/ai/chat") return { response: tutorAnswer };
  const match = path.match(/^\/decks\/(\w+)\/(.+)$/);
  if (match) {
    const [, deckId, rest] = match;
    const notes = notesOf[deckId] ?? [];
    if (rest === "document/info") return { hasDocument: deckId === "bio" };
    if (rest === "notes") return notes;
    if (rest === "notes/tags") return tagsOf[deckId]?.split(",") ?? [];
    if (rest === "card-states")
      return Object.fromEntries(notes.map((note, index) => [note.id, stateOf(index)]));
    if (rest === "notes/page") {
      const items = [...notes].reverse().map((note, index) => ({ note, state: stateOf(index) }));
      return {
        items,
        total: counts[deckId]?.noteCount ?? items.length,
        page: Number(query.get("page") ?? 0),
        size: 25,
      };
    }
  }
  return undefined;
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const unexpected = [];
try {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    colorScheme: "light",
  });
  await context.addInitScript(
    ({ picture, user }) => {
      // Fixture local sin firma; nunca llega a un backend.
      const encode = (value) =>
        btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const token = [
        encode({ alg: "none", typ: "JWT" }),
        encode({ sub: user, name: "Carlos", email: "carlos@example.invalid", picture, exp: 4102444800 }),
        "fixture",
      ].join(".");
      localStorage.setItem("loopdeck_jwt_token", token);
      // Barajado reproducible para el test de opciones.
      let seed = 20261127;
      Math.random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    { picture: AVATAR_URL, user: USER },
  );
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.href === AVATAR_URL)
      return route.fulfill({ body: avatar, contentType: "image/jpeg" });
    if (url.origin === origin && url.pathname.startsWith("/api/")) {
      const body = apiResponse(
        request.method().toLowerCase(),
        url.pathname.slice(4),
        url.searchParams,
        request.postData(),
      );
      if (body === undefined) {
        unexpected.push(`${request.method()} ${url.pathname}`);
        return route.fulfill({ status: 501, json: { message: "Missing screenshot fixture" } });
      }
      return route.fulfill({ json: body });
    }
    const fontOrigins = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
    if (url.origin !== origin && !fontOrigins.includes(url.origin)) {
      unexpected.push(`external ${url.href}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => unexpected.push(error.message));

  const shrinker = await browser.newPage({ viewport: FINAL, deviceScaleFactor: 1 });
  async function capture(name) {
    await page.evaluate(async () => {
      for (const font of [
        '400 16px "Anton"',
        '400 16px "Inter"',
        '500 16px "Inter"',
        '600 16px "Inter"',
        '700 16px "Inter"',
        '800 16px "Inter"',
      ]) {
        const loaded = await document.fonts.load(font);
        if (!loaded.length || loaded.some((face) => face.status !== "loaded")) {
          throw new Error(`Required app font did not load: ${font}`);
        }
      }
      await document.fonts.ready;
    });
    await expect(page.locator(".spinner, [aria-busy='true'], [role='status'] .skeleton")).toHaveCount(0);
    await expect(page.locator("[role='status'][aria-live]")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images].every((img) => img.complete && img.naturalWidth > 0),
        ),
      )
      .toBe(true);
    const full = await page.screenshot({ fullPage: false, animations: "disabled" });
    // Reducción a 860 × 1864 con el remuestreo de alta calidad de Chromium.
    const dataUrl = await shrinker.evaluate(
      async ({ src, width, height }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL("image/png");
      },
      { src: `data:image/png;base64,${full.toString("base64")}`, ...FINAL },
    );
    await writeFile(`${output}/${name}.png`, Buffer.from(dataUrl.split(",")[1], "base64"));
  }

  // 1. Colección de mazos.
  await page.goto(origin);
  await expect(page.getByRole("article")).toHaveCount(decks.length);
  await expect(page.getByText("86 tarjetas", { exact: true })).toBeVisible();
  await capture("decks-mobile");

  // 2. Centro de estudio de un mazo con apuntes vinculados.
  await page.goto(`${origin}/hub/bio`);
  await expect(page.getByRole("heading", { name: "Cómo quieres estudiar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver Documento Original" })).toBeVisible();
  await capture("study-hub-mobile");

  // 3. Repaso espaciado con la respuesta a la vista.
  await page.goto(`${origin}/study/bio`);
  await page.getByRole("button", { name: "Mostrar Respuesta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tarjeta volteada" })).toBeVisible();
  await capture("study-mobile");

  // 4. Test de cuatro opciones con la respuesta ya elegida.
  await page.goto(`${origin}/hub/his/quiz`);
  await expect(page.getByRole("heading", { name: "Test de opciones" })).toBeVisible();
  const question = (await page.locator(".card .flashcard-content").innerText()).trim();
  const answer = seeds.his.find(([front]) => front === question)?.[1];
  if (!answer) throw new Error(`Unknown quiz question: ${question}`);
  await page.locator(".quiz-option-btn", { hasText: answer }).click();
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeVisible();
  await capture("quiz-mobile");

  // 5. Tutor IA respondiendo sobre el mazo.
  await page.goto(`${origin}/hub/bio/tutor`);
  await page.getByRole("textbox", { name: "Pregunta al tutor IA" }).fill(tutorQuestion);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("tienen más mitocondrias", { exact: false })).toBeVisible();
  // Borrador de la siguiente pregunta: evita el placeholder recortado y el botón apagado.
  await page.getByRole("textbox", { name: "Pregunta al tutor IA" }).fill(tutorFollowUp);
  await expect(page.getByRole("button", { name: "Enviar" })).toBeEnabled();
  await capture("tutor-mobile");

  // 6. Estadísticas por mazo.
  await page.goto(`${origin}/stats`);
  await expect(page.getByRole("heading", { name: "Por mazo" })).toBeVisible();
  await capture("stats-mobile");

  if (unexpected.length) throw new Error(`Unexpected requests/errors: ${unexpected.join(", ")}`);
  console.log("Captured six mobile screens with verified app fonts and local fixtures.");
} finally {
  await browser.close();
}
