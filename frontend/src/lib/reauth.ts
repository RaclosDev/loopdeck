import { isAxiosError } from 'axios';

/**
 * Mensaje para quien no ha podido confirmar su identidad, o `null` si el fallo es de otra clase.
 * El servidor responde 403 si la contraseña o la credencial de Google no valen y 429 cuando la
 * cuenta acumula demasiados intentos fallidos.
 */
export function reauthMessage(err: unknown): string | null {
  if (!isAxiosError(err)) return null;
  if (err.response?.status === 429) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a probar.';
  }
  if (err.response?.status === 403) {
    return 'No hemos podido confirmar tu identidad. Revisa la contraseña o, si tu cuenta entra con Google, confirma con Google.';
  }
  return null;
}
