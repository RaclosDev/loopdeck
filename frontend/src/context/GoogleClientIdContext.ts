import { createContext, useContext } from 'react';

/**
 * Identificador de cliente de Google para quien ya ha iniciado sesión, o `null` si no hay Google.
 * Se usa para volver a confirmar la identidad sin cargar el script de Google al abrir la app.
 */
export const GoogleClientIdContext = createContext<string | null>(null);

export function useGoogleClientId(): string | null {
  return useContext(GoogleClientIdContext);
}
