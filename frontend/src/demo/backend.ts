/**
 * Backend ficticio del modo demo: guarda mazos, notas y tarjetas en memoria y responde a las
 * mismas rutas que la API real. Los cambios se pierden al recargar la página.
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { Card, Deck, DeckStats, DueCardDto, Note, StudyBatch, TemplateDeck } from '../types';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const USER = 'demo';

let sequence = 0;
const newId = (prefix: string) => `${prefix}-${(++sequence).toString(36)}`;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const decks: Deck[] = [];
const notes: Note[] = [];
const cards: Card[] = [];
const snapshots = new Map<string, Card>();

type Seed = [front: string, back: string] | [cloze: string];

function clozeIndexes(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(/\{\{c(\d+)::/g)) found.add(Number(match[1]));
  return [...found].sort((a, b) => a - b);
}

function ordinalsFor(noteType: string, fieldsJson: string): number[] {
  if (noteType === 'reverse') return [0, 1];
  if (noteType === 'cloze') {
    let text = '';
    try {
      text = String((JSON.parse(fieldsJson) as { text?: string }).text ?? '');
    } catch {
      text = '';
    }
    const indexes = clozeIndexes(text);
    return indexes.length ? indexes.map((index) => index - 1) : [0];
  }
  return [0];
}

function addNote(deckId: string, noteType: string, fieldsJson: string, tags: string, ageMs = 0) {
  const now = iso(-ageMs);
  const note: Note = {
    id: newId('n'),
    userId: USER,
    deckId,
    noteType,
    fieldsJson,
    tags,
    createdAt: now,
    updatedAt: now,
  };
  notes.push(note);
  for (const cardOrdinal of ordinalsFor(noteType, fieldsJson)) {
    cards.push({
      id: newId('c'),
      noteId: note.id,
      cardOrdinal,
      state: 'new',
      due: now,
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      learningStep: 0,
      suspended: false,
      buried: false,
      flagColor: null,
      leech: false,
      createdAt: now,
    });
  }
  return note;
}

function addDeck(name: string, description: string, ageDays = 0): Deck {
  const deck: Deck = {
    id: newId('d'),
    userId: USER,
    name,
    parentId: null,
    presetId: null,
    description,
    createdAt: iso(-ageDays * DAY),
  };
  decks.push(deck);
  return deck;
}

/** Reparte las tarjetas sembradas entre nuevas, en aprendizaje, pendientes y ya repasadas. */
function age(card: Card, slot: number) {
  const kind = slot % 6;
  if (kind === 0) return;
  if (kind === 1) {
    Object.assign(card, {
      state: 'learning',
      due: iso(-5 * MINUTE),
      repetitions: 1,
      learningStep: 1,
    });
    return;
  }
  const interval = [3, 8, 15, 30][slot % 4];
  const overdue = kind === 2 || kind === 3;
  Object.assign(card, {
    state: 'review',
    intervalDays: interval,
    repetitions: 2 + (slot % 5),
    lapses: slot % 7 === 0 ? 1 : 0,
    easeFactor: 2.3 + (slot % 4) * 0.1,
    due: iso(overdue ? -((slot % 3) + 1) * DAY : ((slot % 9) + 1) * DAY),
  });
}

function seedDeck(
  name: string,
  description: string,
  tags: string,
  seeds: Seed[],
  options: { ageDays: number; fresh?: boolean; noteType?: string },
) {
  const deck = addDeck(name, description, options.ageDays);
  seeds.forEach((seed, index) => {
    const isCloze = seed.length === 1;
    const note = addNote(
      deck.id,
      isCloze ? 'cloze' : (options.noteType ?? 'basic'),
      JSON.stringify(isCloze ? { text: seed[0] } : { front: seed[0], back: seed[1] }),
      tags,
      options.ageDays * DAY - index * MINUTE,
    );
    if (options.fresh) return;
    cards
      .filter((card) => card.noteId === note.id)
      .forEach((card, extra) => age(card, index + extra));
  });
}

seedDeck(
  'Inglés B2 · Phrasal verbs',
  'Verbos con partícula que salen en el examen B2, con un ejemplo en cada tarjeta.',
  'ingles,b2',
  [
    ['to put off', 'Aplazar. «We had to put off the meeting until Friday.»'],
    ['to run out of', 'Quedarse sin algo. «We have run out of coffee.»'],
    ['to look forward to', 'Tener ganas de. «I look forward to hearing from you.»'],
    ['to get along with', 'Llevarse bien con. «She gets along with her flatmates.»'],
    ['to give up', 'Rendirse o dejar un hábito. «He gave up smoking last year.»'],
    ['to bring up', 'Sacar un tema; criar. «Don’t bring up politics at dinner.»'],
    ['to come across', 'Encontrar por casualidad. «I came across an old photo.»'],
    ['to turn down', 'Rechazar; bajar el volumen. «She turned down the offer.»'],
    ['to set up', 'Montar o fundar. «They set up a small company.»'],
    ['to carry out', 'Llevar a cabo. «The team carried out the survey.»'],
    ['to figure out', 'Averiguar, entender. «I can’t figure out this exercise.»'],
    ['to take after', 'Parecerse a un familiar. «He takes after his mother.»'],
    ['to break down', 'Averiarse; venirse abajo. «The car broke down on the motorway.»'],
    ['to make up for', 'Compensar. «He worked late to make up for lost time.»'],
    ['to keep up with', 'Seguir el ritmo de. «I can’t keep up with the news.»'],
    ['to point out', 'Señalar, hacer notar. «She pointed out two mistakes.»'],
  ],
  { ageDays: 40 },
);

seedDeck(
  'Capitales de Europa',
  'País por un lado, capital por el otro. Se estudia en los dos sentidos.',
  'geografia',
  [
    ['Portugal', 'Lisboa'],
    ['Noruega', 'Oslo'],
    ['Hungría', 'Budapest'],
    ['Croacia', 'Zagreb'],
    ['Finlandia', 'Helsinki'],
    ['Rumanía', 'Bucarest'],
    ['Islandia', 'Reikiavik'],
    ['Eslovenia', 'Liubliana'],
    ['Letonia', 'Riga'],
    ['Bulgaria', 'Sofía'],
    ['Eslovaquia', 'Bratislava'],
    ['Irlanda', 'Dublín'],
  ],
  { ageDays: 25, noteType: 'reverse' },
);

seedDeck(
  'Biología · La célula',
  'Orgánulos y procesos básicos, con tarjetas de huecos para las definiciones.',
  'biologia,celula',
  [
    [
      'La {{c1::mitocondria}} obtiene energía en forma de {{c2::ATP}} mediante la respiración celular.',
    ],
    ['Los {{c1::ribosomas}} sintetizan proteínas a partir del {{c2::ARN mensajero}}.'],
    ['La fotosíntesis ocurre en los {{c1::cloroplastos}}, que contienen {{c2::clorofila}}.'],
    ['El {{c1::núcleo}} guarda el material genético de la célula eucariota.'],
    ['La membrana plasmática es una {{c1::bicapa lipídica::estructura}} con proteínas.'],
    [
      '¿Qué orgánulo digiere los residuos celulares?',
      'El lisosoma, mediante enzimas hidrolíticas.',
    ],
    [
      '¿En qué se diferencian la célula procariota y la eucariota?',
      'La procariota no tiene núcleo delimitado por membrana ni orgánulos membranosos.',
    ],
    [
      '¿Qué función tiene el aparato de Golgi?',
      'Modifica, empaqueta y distribuye proteínas y lípidos.',
    ],
    [
      '¿Qué es la mitosis?',
      'La división del núcleo que da dos células hijas con la misma dotación genética.',
    ],
    [
      '¿Qué estructura da rigidez a la célula vegetal?',
      'La pared celular, formada sobre todo por celulosa.',
    ],
    ['¿Dónde se sintetizan los lípidos?', 'En el retículo endoplasmático liso.'],
  ],
  { ageDays: 18 },
);

seedDeck(
  'Historia de España · Siglo XX',
  'Fechas y hechos clave para el examen de Historia.',
  'historia,espana',
  [
    ['¿En qué año se proclamó la Segunda República?', 'En 1931, el 14 de abril.'],
    ['¿Entre qué años transcurrió la Guerra Civil?', 'De 1936 a 1939.'],
    ['¿Qué fue el Desastre del 98?', 'La pérdida de Cuba, Puerto Rico y Filipinas en 1898.'],
    ['¿Cuándo se aprobó la Constitución vigente?', 'En 1978, por referéndum el 6 de diciembre.'],
    [
      '¿Qué ocurrió el 23 de febrero de 1981?',
      'Un intento fallido de golpe de Estado en el Congreso.',
    ],
    ['¿En qué año entró España en la Comunidad Económica Europea?', 'En 1986.'],
    [
      '¿Quién presidió el primer gobierno de la Transición elegido en las urnas?',
      'Adolfo Suárez, tras las elecciones de 1977.',
    ],
    [
      '¿Qué fue la dictadura de Primo de Rivera?',
      'El régimen militar de 1923 a 1930, bajo Alfonso XIII.',
    ],
    [
      '¿Qué dos ciudades acogieron grandes eventos en 1992?',
      'Barcelona, los Juegos Olímpicos, y Sevilla, la Exposición Universal.',
    ],
    [
      '¿Qué fueron los Pactos de la Moncloa?',
      'Los acuerdos económicos y políticos de 1977 entre gobierno, partidos y sindicatos.',
    ],
  ],
  { ageDays: 12 },
);

seedDeck(
  'JavaScript · Fundamentos',
  'Mazo recién creado: todas las tarjetas están por estrenar.',
  'programacion,javascript',
  [
    [
      '¿Qué diferencia hay entre let y const?',
      'const no permite reasignar la variable; let sí. Las dos tienen ámbito de bloque.',
    ],
    ['¿Qué devuelve typeof null?', '"object", por un error histórico del lenguaje.'],
    ['¿Qué es una closure?', 'Una función que recuerda las variables del ámbito donde se creó.'],
    [
      '¿Qué diferencia hay entre == y ===?',
      '== convierte los tipos antes de comparar; === compara valor y tipo.',
    ],
    [
      '¿Qué hace Array.prototype.map?',
      'Devuelve un array nuevo con el resultado de aplicar una función a cada elemento.',
    ],
    [
      '¿Qué es una promesa?',
      'Un objeto que representa el resultado futuro de una operación asíncrona.',
    ],
    [
      'El operador {{c1::?.}} accede a una propiedad sin fallar si el objeto es {{c2::null o undefined}}.',
    ],
    [
      '¿Para qué sirve async/await?',
      'Para escribir código asíncrono basado en promesas con forma secuencial.',
    ],
    [
      '¿Qué es el hoisting?',
      'La elevación de las declaraciones al principio de su ámbito antes de ejecutar el código.',
    ],
  ],
  { ageDays: 1, fresh: true },
);

const TEMPLATES: (TemplateDeck & { cards: [string, string][] })[] = [
  {
    id: 'capitals-europe',
    name: 'Capitales de Europa',
    description: 'Aprende las capitales de Europa.',
    category: 'Geografía',
    icon: 'map',
    cards: [
      ['Alemania', 'Berlín'],
      ['Austria', 'Viena'],
      ['Bélgica', 'Bruselas'],
      ['Dinamarca', 'Copenhague'],
      ['Francia', 'París'],
      ['Grecia', 'Atenas'],
      ['Italia', 'Roma'],
      ['Países Bajos', 'Ámsterdam'],
      ['Polonia', 'Varsovia'],
      ['Suecia', 'Estocolmo'],
    ],
  },
  {
    id: 'capitals-america',
    name: 'Capitales de América',
    description: 'Aprende las capitales de América.',
    category: 'Geografía',
    icon: 'map',
    cards: [
      ['Argentina', 'Buenos Aires'],
      ['Bolivia', 'Sucre'],
      ['Canadá', 'Ottawa'],
      ['Chile', 'Santiago'],
      ['Colombia', 'Bogotá'],
      ['Cuba', 'La Habana'],
      ['Ecuador', 'Quito'],
      ['México', 'Ciudad de México'],
      ['Perú', 'Lima'],
      ['Uruguay', 'Montevideo'],
    ],
  },
  {
    id: 'capitals-asia',
    name: 'Capitales de Asia',
    description: 'Aprende las capitales de Asia.',
    category: 'Geografía',
    icon: 'map',
    cards: [
      ['China', 'Pekín'],
      ['Corea del Sur', 'Seúl'],
      ['Filipinas', 'Manila'],
      ['India', 'Nueva Delhi'],
      ['Indonesia', 'Yakarta'],
      ['Japón', 'Tokio'],
      ['Mongolia', 'Ulán Bator'],
      ['Nepal', 'Katmandú'],
      ['Tailandia', 'Bangkok'],
      ['Vietnam', 'Hanói'],
    ],
  },
  {
    id: 'capitals-africa',
    name: 'Capitales de África',
    description: 'Aprende las capitales de África.',
    category: 'Geografía',
    icon: 'map',
    cards: [
      ['Angola', 'Luanda'],
      ['Egipto', 'El Cairo'],
      ['Etiopía', 'Adís Abeba'],
      ['Ghana', 'Acra'],
      ['Kenia', 'Nairobi'],
      ['Marruecos', 'Rabat'],
      ['Nigeria', 'Abuya'],
      ['Senegal', 'Dakar'],
      ['Túnez', 'Túnez'],
      ['Uganda', 'Kampala'],
    ],
  },
  {
    id: 'capitals-oceania',
    name: 'Capitales de Oceanía',
    description: 'Aprende las capitales de Oceanía.',
    category: 'Geografía',
    icon: 'map',
    cards: [
      ['Australia', 'Canberra'],
      ['Fiyi', 'Suva'],
      ['Nueva Zelanda', 'Wellington'],
      ['Papúa Nueva Guinea', 'Puerto Moresby'],
      ['Samoa', 'Apia'],
      ['Tonga', 'Nukualofa'],
      ['Vanuatu', 'Port Vila'],
    ],
  },
  {
    id: 'capitals-world',
    name: 'Capitales del Mundo',
    description: 'Todas las capitales del mundo en un solo mazo.',
    category: 'Geografía',
    icon: 'globe',
    cards: [
      ['Alemania', 'Berlín'],
      ['Argentina', 'Buenos Aires'],
      ['Australia', 'Canberra'],
      ['Canadá', 'Ottawa'],
      ['China', 'Pekín'],
      ['Egipto', 'El Cairo'],
      ['Francia', 'París'],
      ['India', 'Nueva Delhi'],
      ['Japón', 'Tokio'],
      ['Kenia', 'Nairobi'],
      ['México', 'Ciudad de México'],
      ['Perú', 'Lima'],
    ],
  },
  {
    id: 'flags-world',
    name: 'Banderas del Mundo',
    description: 'Memoriza las banderas de todos los países usando emojis nativos.',
    category: 'Cultura',
    icon: 'flag',
    cards: [
      ['🇦🇷', 'Argentina'],
      ['🇧🇷', 'Brasil'],
      ['🇨🇦', 'Canadá'],
      ['🇩🇪', 'Alemania'],
      ['🇪🇸', 'España'],
      ['🇫🇷', 'Francia'],
      ['🇬🇷', 'Grecia'],
      ['🇮🇹', 'Italia'],
      ['🇯🇵', 'Japón'],
      ['🇲🇽', 'México'],
      ['🇵🇹', 'Portugal'],
      ['🇸🇪', 'Suecia'],
    ],
  },
];

// ---------- consultas ----------

const noteOf = (card: Card) => notes.find((note) => note.id === card.noteId)!;
const cardsOfDeck = (deckId: string) => {
  const ids = new Set(notes.filter((note) => note.deckId === deckId).map((note) => note.id));
  return cards.filter((card) => ids.has(card.noteId));
};
const isDue = (card: Card) =>
  !card.suspended && !card.buried && (card.state === 'new' || Date.parse(card.due) <= Date.now());

function statsOf(deckId: string): DeckStats {
  const all = cardsOfDeck(deckId);
  const due = all.filter(isDue);
  return {
    newCount: due.filter((card) => card.state === 'new').length,
    learningCount: due.filter((card) => card.state === 'learning' || card.state === 'relearning')
      .length,
    reviewCount: due.filter((card) => card.state === 'review').length,
    totalCount: all.length,
    noteCount: notes.filter((note) => note.deckId === deckId).length,
  };
}

function noteState(noteId: string): string {
  const rank: Record<string, number> = { learning: 0, relearning: 0, new: 1, review: 2 };
  const states = cards.filter((card) => card.noteId === noteId).map((card) => card.state);
  const best = states.sort((a, b) => (rank[a] ?? 3) - (rank[b] ?? 3))[0] ?? 'new';
  return best === 'relearning' ? 'learning' : best;
}

const formatInterval = (ms: number) => {
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))}h`;
  return `${Math.round(ms / DAY)}d`;
};

/** Planificador simplificado: pasos de 1 y 10 minutos y, después, intervalos en días. */
function schedule(card: Card, rating: number): Partial<Card> & { delay: number } {
  if (card.state === 'review') {
    if (rating === 1)
      return { state: 'relearning', learningStep: 0, lapses: card.lapses + 1, delay: 10 * MINUTE };
    const base = Math.max(1, card.intervalDays);
    const factor = rating === 2 ? 1.2 : rating === 3 ? card.easeFactor : card.easeFactor * 1.3;
    const days = Math.max(base + 1, Math.round(base * factor));
    return { state: 'review', intervalDays: days, delay: days * DAY };
  }
  if (card.state === 'relearning') {
    if (rating === 1) return { delay: 10 * MINUTE };
    if (rating === 2) return { delay: 15 * MINUTE };
    const days = Math.max(1, Math.round(card.intervalDays * (rating === 3 ? 0.5 : 0.7)));
    return { state: 'review', intervalDays: days, delay: days * DAY };
  }
  if (rating === 1) return { state: 'learning', learningStep: 0, delay: MINUTE };
  if (rating === 2) return { state: 'learning', delay: 6 * MINUTE };
  if (rating === 3) {
    if (card.state === 'new' || card.learningStep === 0)
      return { state: 'learning', learningStep: 1, delay: 10 * MINUTE };
    return { state: 'review', learningStep: 0, intervalDays: 1, delay: DAY };
  }
  return { state: 'review', learningStep: 0, intervalDays: 4, delay: 4 * DAY };
}

function toDto(card: Card): DueCardDto {
  const intervals: Record<number, string> = {};
  for (const rating of [1, 2, 3, 4])
    intervals[rating] = formatInterval(schedule(card, rating).delay);
  return { card: { ...card }, note: { ...noteOf(card) }, intervals };
}

function batchOf(deckId: string, limit: number, order: string): StudyBatch {
  const priority = (card: Card) => {
    const isNew = card.state === 'new';
    if (order === 'review_first') return isNew ? 1 : 0;
    if (order === 'mixed') return 0;
    return isNew ? 0 : 1;
  };
  const due = cardsOfDeck(deckId)
    .filter(isDue)
    .sort((a, b) => priority(a) - priority(b) || Date.parse(a.due) - Date.parse(b.due));
  return {
    items: due.slice(0, limit).map(toDto),
    counts: statsOf(deckId),
    hasMore: due.length > limit,
  };
}

// ---------- tutor de ejemplo ----------

function tutorReply(prompt: string, context: string): string {
  const pairs = [...context.matchAll(/Pregunta: (.*)\nRespuesta: (.*)\n/g)].map(
    (match) => [match[1], match[2]] as const,
  );
  const words = prompt.toLowerCase().match(/[a-záéíóúñü]{4,}/g) ?? [];
  const hit = pairs.find(([front, back]) =>
    words.some((word) => `${front} ${back}`.toLowerCase().includes(word)),
  );
  const note =
    '\n\n_Respuesta de ejemplo del modo demo: en tu cuenta, el tutor responde con IA a partir de tus tarjetas._';
  if (hit) return `Según tus tarjetas:\n\n**${hit[0]}**\n${hit[1]}${note}`;
  const sample = pairs.slice(0, 3).map(([front]) => `- ${front}`);
  return `No encuentro eso en este mazo. Prueba a preguntarme por alguno de estos conceptos:\n\n${sample.join('\n')}${note}`;
}

// ---------- enrutado ----------

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function findDeck(id: string) {
  const deck = decks.find((item) => item.id === id);
  if (!deck) throw new HttpError(404, 'Mazo no encontrado');
  return deck;
}

function removeNotes(match: (note: Note) => boolean) {
  for (let index = notes.length - 1; index >= 0; index--) {
    if (!match(notes[index])) continue;
    const noteId = notes[index].id;
    for (let c = cards.length - 1; c >= 0; c--) if (cards[c].noteId === noteId) cards.splice(c, 1);
    notes.splice(index, 1);
  }
}

type Body = Record<string, unknown>;
type Query = Record<string, unknown>;

function route(method: string, path: string, body: unknown, query: Query): unknown {
  const data = (body ?? {}) as Body;
  const parts = path.split('/').filter(Boolean);
  const [root, id, sub, extra] = parts;

  if (root === 'auth') return {};
  if (root === 'version') return { version: 'demo' };

  if (root === 'decks') {
    if (!id) {
      if (method === 'get') return decks.map((deck) => ({ ...deck }));
      const name = String(data.name ?? '').trim();
      if (!name) throw new HttpError(400, 'El nombre es obligatorio');
      return { ...addDeck(name, String(data.description ?? '')) };
    }
    if (id === 'stats' && !sub)
      return Object.fromEntries(decks.map((deck) => [deck.id, statsOf(deck.id)]));
    const deck = findDeck(id);
    if (!sub) {
      if (method === 'put') {
        deck.name = String(data.name ?? deck.name).trim() || deck.name;
        deck.description = String(data.description ?? '');
        return { ...deck };
      }
      if (method === 'delete') {
        removeNotes((note) => note.deckId === id);
        decks.splice(decks.indexOf(deck), 1);
        return null;
      }
    }
    if (sub === 'document') {
      if (extra === 'info') return { hasDocument: false };
      throw new HttpError(403, 'Los documentos no están disponibles en el modo demo');
    }
    if (sub === 'card-states')
      return Object.fromEntries(
        notes.filter((note) => note.deckId === id).map((note) => [note.id, noteState(note.id)]),
      );
    if (sub === 'notes') {
      const own = notes.filter((note) => note.deckId === id);
      if (!extra) return own.map((note) => ({ ...note }));
      if (extra === 'tags')
        return [...new Set(own.flatMap((note) => note.tags.split(',').map((tag) => tag.trim())))]
          .filter(Boolean)
          .sort();
      const search = String(query.search ?? '')
        .trim()
        .toLowerCase();
      const tag = String(query.tag ?? '').trim();
      const size = Number(query.size ?? 25) || 25;
      const page = Number(query.page ?? 0) || 0;
      const matches = own
        .filter((note) => !search || note.fieldsJson.toLowerCase().includes(search))
        .filter(
          (note) =>
            !tag ||
            note.tags
              .split(',')
              .map((item) => item.trim())
              .includes(tag),
        )
        .reverse();
      return {
        items: matches
          .slice(page * size, (page + 1) * size)
          .map((note) => ({ note: { ...note }, state: noteState(note.id) })),
        total: matches.length,
        page,
        size,
      };
    }
    if (sub === 'import') {
      const list = Array.isArray(body) ? (body as Body[]) : [];
      for (const item of list)
        addNote(
          id,
          String(item.noteType ?? 'basic'),
          String(item.fieldsJson),
          String(item.tags ?? ''),
        );
      return null;
    }
    if (sub === 'study') {
      const order = String(query.order ?? 'new_first');
      if (extra === 'batch') return batchOf(id, Number(query.limit ?? 50) || 50, order);
      return batchOf(id, Number(query.limit ?? 20) || 20, order).items;
    }
  }

  if (root === 'notes') {
    if (!id) {
      findDeck(String(data.deckId));
      return {
        ...addNote(
          String(data.deckId),
          String(data.noteType ?? 'basic'),
          String(data.fieldsJson),
          String(data.tags ?? ''),
        ),
      };
    }
    const note = notes.find((item) => item.id === id);
    if (!note) throw new HttpError(404, 'Nota no encontrada');
    if (method === 'delete') {
      removeNotes((item) => item.id === id);
      return null;
    }
    note.fieldsJson = String(data.fieldsJson);
    note.tags = String(data.tags ?? '');
    note.updatedAt = iso(0);
    return { ...note };
  }

  if (root === 'study' && id === 'prepare') {
    const ids = Array.isArray(data.deckIds) ? (data.deckIds as string[]) : [];
    const order = String(data.order ?? 'new_first');
    return Object.fromEntries(
      ids
        .filter((deckId) => decks.some((deck) => deck.id === deckId))
        .map((deckId) => [deckId, { batch: batchOf(deckId, 50, order), validForMs: 60_000 }]),
    );
  }

  if (root === 'cards') {
    const card = cards.find((item) => item.id === id);
    if (!card) throw new HttpError(404, 'Tarjeta no encontrada');
    if (sub === 'review') {
      const reviewId = newId('r');
      snapshots.set(reviewId, { ...card });
      const rating = Number(data.rating) || 3;
      const { delay, ...changes } = schedule(card, rating);
      const custom = Number(data.customIntervalMinutes) || 0;
      const wait = custom > 0 ? custom * MINUTE : delay;
      Object.assign(card, changes, { repetitions: card.repetitions + 1, due: iso(wait) });
      if (custom >= 24 * 60)
        Object.assign(card, { state: 'review', intervalDays: Math.round(custom / (24 * 60)) });
      return { card: { ...card }, reviewId };
    }
    if (sub === 'restore') {
      const previous = snapshots.get(String(data.reviewId));
      if (!previous) return { card: { ...card }, alreadyUndone: true };
      snapshots.delete(String(data.reviewId));
      Object.assign(card, previous);
      return { card: { ...card }, alreadyUndone: false };
    }
  }

  if (root === 'templates') {
    if (!id)
      return TEMPLATES.map(({ cards: sample, ...template }) => ({
        ...template,
        cardCount: sample.length,
      }));
    const template = TEMPLATES.find((item) => item.id === String(query.type));
    if (!template) throw new HttpError(404, 'Plantilla no encontrada');
    const deck = addDeck(template.name, template.description);
    for (const [front, back] of template.cards)
      addNote(deck.id, 'basic', JSON.stringify({ front, back }), template.category ?? '');
    return { ...deck };
  }

  if (root === 'ai') {
    if (id === 'chat')
      return { response: tutorReply(String(data.prompt ?? ''), String(data.context ?? '')) };
    if (id === 'mass-define')
      return String(data.words ?? '')
        .split('\n')
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => ({
          front: word,
          back: 'Definición de ejemplo. En tu cuenta la redacta la IA sin repetir el término.',
        }));
  }

  throw new HttpError(404, 'No disponible en el modo demo');
}

export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url = new URL(config.url ?? '/', 'http://demo.local');
  const query: Query = { ...Object.fromEntries(url.searchParams), ...(config.params ?? {}) };
  let body: unknown = config.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = undefined;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
  try {
    const data = route((config.method ?? 'get').toLowerCase(), url.pathname, body, query);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Error';
    throw new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, undefined, {
      data: { message, error: message },
      status,
      statusText: message,
      headers: {},
      config,
    });
  }
}
