import { clearOfflineApiCache } from './offlineCache';

export const TOKEN_KEY = 'loopdeck_jwt_token';

/** Cuánto espera «Cerrar sesión» a que el servidor anule la cookie antes de seguir. */
const REVOKE_WAIT_MS = 3000;

/**
 * Fin de sesión en este navegador: borra el token y las respuestas de la API guardadas para usar
 * sin conexión. Es lo primero que hay que hacer, antes de hablar con el servidor, y lo comparten
 * todos los caminos (cerrar sesión, borrar datos locales, expulsión por refresco rechazado y fallo
 * al iniciar). No toca el estado de React: eso lo hace quien tenga acceso a él.
 */
export async function endLocalSession(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  await clearOfflineApiCache();
}

/**
 * Pide al servidor que anule la cookie de refresco. Usa `keepalive` para que la petición sobreviva
 * a una navegación inmediata, y espera como mucho unos segundos para que la página siguiente no
 * pueda recuperar la sesión con una cookie que aún valga. Nunca falla ni se queda colgada.
 */
export async function revokeRefreshCookie(waitMs = REVOKE_WAIT_MS): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
    const limit = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, waitMs);
    });
    await Promise.race([request, limit]);
  } catch {
    // Sin red el servidor no se entera, pero lo local ya está borrado.
  } finally {
    clearTimeout(timer);
  }
}
