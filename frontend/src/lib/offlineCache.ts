/** Caché del service worker con respuestas de la API (ver public/sw.js). */
export const API_CACHE_NAME = 'api-cache';

/** Borra las respuestas de la API guardadas para usar sin conexión. Nunca falla. */
export async function clearOfflineApiCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(API_CACHE_NAME);
  } catch {
    // Sin acceso a CacheStorage (modo privado, permisos): no hay nada que borrar.
  }
}
