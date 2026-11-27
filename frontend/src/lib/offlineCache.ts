import { purgeReviewsExcept } from './reviewOutbox';

/** Caché del service worker con respuestas de la API (ver public/sw.js). */
export const API_CACHE_NAME = 'api-cache';

/** Última cuenta que usó este navegador: si cambia, la caché sin conexión ya no es suya. */
const LAST_ACCOUNT_KEY = 'loopdeck_last_sub';

/**
 * Lista blanca de lo que se guarda para consultar sin conexión: los mazos, sus estadísticas y sus
 * notas. Todo lo demás se queda fuera a propósito: la exportación, los documentos, las passkeys,
 * el perfil, la IA, las plantillas y la sesión no deben quedarse en el disco, y la cola de estudio
 * (/study) tampoco: una cola antigua serviría tarjetas ya repasadas, y sin conexión no se pueden
 * guardar los repasos de todos modos.
 */
const OFFLINE_API_PATHS = [
  /^\/api\/decks$/,
  /^\/api\/decks\/stats$/,
  /^\/api\/decks\/[^/]+\/notes$/,
  /^\/api\/decks\/[^/]+\/notes\/(?:page|tags)$/,
  /^\/api\/decks\/[^/]+\/card-states$/,
];

/** Dice si el service worker puede guardar la respuesta de esta ruta de la API. */
export function isOfflineCacheable(pathname: string): boolean {
  return OFFLINE_API_PATHS.some((pattern) => pattern.test(pathname));
}

/** Borra las respuestas de la API guardadas para usar sin conexión. Nunca falla. */
export async function clearOfflineApiCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(API_CACHE_NAME);
  } catch {
    // Sin acceso a CacheStorage (modo privado, permisos): no hay nada que borrar.
  }
}

/**
 * Apunta qué cuenta está usando el navegador. Si no es la misma que la última (o no hay registro,
 * por ejemplo tras una versión antigua), borra la caché sin conexión antes de que nadie la lea.
 * También vacía la cola de repasos pendientes de cualquier otra cuenta.
 */
export async function adoptAccount(subject: string | undefined): Promise<boolean> {
  const previous = localStorage.getItem(LAST_ACCOUNT_KEY);
  const changed = previous !== (subject ?? null);
  if (changed) await clearOfflineApiCache();
  // Los repasos pendientes de otra cuenta no se envían con esta sesión: se descartan.
  if (subject) await purgeReviewsExcept(subject);
  if (subject) localStorage.setItem(LAST_ACCOUNT_KEY, subject);
  return changed;
}
