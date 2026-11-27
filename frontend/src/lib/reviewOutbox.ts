import type { ReviewBody } from '../types';

/**
 * Cola de repasos pendientes de envío, guardada en IndexedDB y separada por cuenta. Sobrevive a las
 * recargas y al cierre de la pestaña: un repaso se apunta aquí antes de enviarlo y se borra solo
 * cuando el servidor lo ha confirmado o lo ha rechazado para siempre. Nada de esto puede romper el
 * estudio: si IndexedDB no existe o falla (modo privado, cuota), la cola sigue en memoria.
 */
const DB_NAME = 'loopdeck-outbox';
const STORE = 'reviews';

export interface StoredReview {
  /** Clave de idempotencia del repaso: la misma que viaja en `body.requestId`. */
  requestId: string;
  account: string;
  deckId?: string;
  cardId: string;
  body: ReviewBody;
  /** Orden de llegada; los repasos de una misma tarjeta se reenvían en este orden. */
  seq: number;
}

export type ReviewFailure = 'conflict' | 'rejected' | 'retry';

let lastSeq = 0;
/** Repasos que se están enviando ahora mismo: la reposición no los envía una segunda vez. */
const inFlight = new Set<string>();
let replaying: Promise<ReplayResult> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'requestId' }).createIndex('account', 'account');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Ejecuta una operación sobre el almacén y cierra la conexión. Nunca rechaza. */
async function withStore<T>(
  mode: IDBTransactionMode,
  fallback: T,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await open();
  if (!db) return fallback;
  return new Promise<T>((resolve) => {
    let result = fallback;
    try {
      const tx = db.transaction(STORE, mode);
      run(tx.objectStore(STORE), (value) => {
        result = value;
      });
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        resolve(fallback);
      };
    } catch {
      db.close();
      resolve(fallback);
    }
  });
}

/** Apunta un repaso antes de enviarlo. */
export async function queueReview(review: Omit<StoredReview, 'seq'>): Promise<void> {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  const stored: StoredReview = { ...review, seq: lastSeq };
  await withStore<void>('readwrite', undefined, (store) => {
    store.put(stored);
  });
}

/** Quita un repaso de la cola: ya está confirmado o el servidor no lo aceptará nunca. */
export async function dropReview(requestId: string): Promise<void> {
  await withStore<void>('readwrite', undefined, (store) => {
    store.delete(requestId);
  });
}

/** Repasos pendientes de esta cuenta, en el orden en que se hicieron. */
export async function storedReviews(account: string): Promise<StoredReview[]> {
  const found = await withStore<StoredReview[]>('readonly', [], (store, done) => {
    const request = store.index('account').getAll(account);
    request.onsuccess = () => done(request.result as StoredReview[]);
  });
  return found.sort((a, b) => a.seq - b.seq);
}

/** Vacía la cola de cualquier cuenta que no sea `account`: una cuenta nunca envía lo de otra. */
export async function purgeReviewsExcept(account: string): Promise<void> {
  await withStore<void>('readwrite', undefined, (store) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if ((cursor.value as StoredReview).account !== account) cursor.delete();
      cursor.continue();
    };
  });
}

/** Borra toda la cola, de todas las cuentas (borrar los datos locales del navegador). */
export async function clearReviewOutbox(): Promise<void> {
  await withStore<void>('readwrite', undefined, (store) => {
    store.clear();
  });
}

/**
 * Qué hacer con un repaso que ha fallado. `conflict` (409): otra pestaña o dispositivo ya repasó la
 * tarjeta. `rejected`: el servidor lo rechaza de forma permanente (datos inválidos, tarjeta
 * borrada...) y reintentarlo en bucle no sirve. `retry`: red, tiempo agotado, 5xx, sesión caducada
 * o límite de frecuencia; se conserva.
 */
export function classifyReviewError(error: unknown): ReviewFailure {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 409) return 'conflict';
  if (status && status >= 400 && status < 500 && ![401, 408, 425, 429].includes(status))
    return 'rejected';
  return 'retry';
}

/** Marca un repaso como «enviándose» mientras dura `task`. */
export async function whileSending<T>(requestId: string, task: () => Promise<T>): Promise<T> {
  inFlight.add(requestId);
  try {
    return await task();
  } finally {
    inFlight.delete(requestId);
  }
}

export interface ReplayResult {
  sent: number;
  conflicts: number;
  rejected: number;
  /** Quedan repasos sin enviar (sin red, 5xx...): conviene volver a intentarlo. */
  failed: boolean;
}

/**
 * Envía los repasos guardados de `account`, de uno en uno y en orden. Se detiene en el primer fallo
 * recuperable para no adelantar repasos de una misma tarjeta. Si ya hay una reposición en marcha,
 * espera a esa en vez de lanzar otra.
 */
export function replayReviews(
  account: string,
  send: (review: StoredReview) => Promise<unknown>,
): Promise<ReplayResult> {
  if (replaying) return replaying;
  replaying = (async () => {
    const result: ReplayResult = { sent: 0, conflicts: 0, rejected: 0, failed: false };
    for (const review of await storedReviews(account)) {
      if (inFlight.has(review.requestId)) continue;
      try {
        await whileSending(review.requestId, () => send(review));
        result.sent++;
      } catch (error) {
        const kind = classifyReviewError(error);
        if (kind === 'retry') {
          result.failed = true;
          break;
        }
        if (kind === 'conflict') result.conflicts++;
        else result.rejected++;
      }
      await dropReview(review.requestId);
    }
    return result;
  })().finally(() => {
    replaying = null;
  });
  return replaying;
}
