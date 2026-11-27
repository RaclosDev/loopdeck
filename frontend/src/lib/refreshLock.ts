import { jwtDecode } from 'jwt-decode';
import { TOKEN_KEY } from './session';

const LOCK_NAME = 'loopdeck-refresh';
/** Margen para no devolver como «fresco» un token que está a punto de caducar. */
const EXPIRY_LEEWAY_MS = 10_000;

const isFresh = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !!exp && exp * 1000 > Date.now() + EXPIRY_LEEWAY_MS;
  } catch {
    return false;
  }
};

/**
 * Renueva la sesión una sola vez entre todas las pestañas del navegador.
 *
 * El refresh token rota en cada uso y las pestañas comparten cookie: si dos refrescan a la vez, la
 * segunda llegaría con una cookie ya gastada. Con Web Locks se hacen de una en una, y la que entra
 * después comprueba si otra ya dejó un token válido distinto del que ella tenía (`staleToken`): en
 * ese caso lo usa y no llama al servidor. Sin Web Locks (navegadores antiguos) se refresca directo y
 * el servidor tolera ese cruce durante unos segundos.
 *
 * `refresh` hace la llamada y devuelve el JWT nuevo; esta función lo guarda antes de soltar el
 * bloqueo para que la siguiente pestaña lo vea.
 */
export async function refreshAcrossTabs(
  staleToken: string | null,
  refresh: () => Promise<string>,
): Promise<string> {
  const run = async (): Promise<string> => {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current && current !== staleToken && isFresh(current)) return current;
    const token = await refresh();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  };
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks?.request) return run();
  return locks.request(LOCK_NAME, run);
}
