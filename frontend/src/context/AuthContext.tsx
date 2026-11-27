import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { adoptAccount } from '../lib/offlineCache';
import { TOKEN_KEY, endLocalSession, revokeRefreshCookie } from '../lib/session';
import { refreshAcrossTabs } from '../lib/refreshLock';
import { DEMO, DEMO_TOKEN } from '../demo/mode';

// En el modo demo la sesión es ficticia y no se lee ni se escribe la del navegador.
const storedToken = () => (DEMO ? DEMO_TOKEN : localStorage.getItem(TOKEN_KEY));

/** Cuánto espera el refresco del arranque: una conexión colgada no debe dejar la app cargando. */
const REFRESH_TIMEOUT_MS = 15_000;

/**
 * Un refresco que no llegó a decidir nada: sin red, tiempo agotado o fallo del servidor (5xx).
 * No es lo mismo que un rechazo (401/403): en ese caso la sesión sí ha terminado.
 */
class RefreshUnavailable extends Error {}
const refreshUnavailable = (error: unknown) =>
  error instanceof RefreshUnavailable ||
  error instanceof TypeError ||
  (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError'));

const userFromToken = (jwtToken: string): User => {
  const decoded = jwtDecode<CustomJwtPayload>(jwtToken);
  return {
    id: decoded.sub || '',
    email: decoded.email || '',
    name: decoded.name || 'User',
    picture: decoded.picture || undefined,
  };
};

export interface CustomJwtPayload extends JwtPayload {
  email?: string;
  name?: string;
  picture?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  points?: number;
  currentStreak?: number;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (jwtToken: string) => void;
  logout: () => Promise<void>;
  updateToken: (newToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(storedToken);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const identity = useRef<string | undefined>(undefined);

  // Si la cuenta no es la misma que la última que usó este navegador, borra los datos de la
  // anterior (React Query y caché sin conexión). Devuelve cuando la caché ya está limpia.
  const synchronizeIdentity = async (jwtToken: string) => {
    const subject = jwtDecode<CustomJwtPayload>(jwtToken).sub;
    if (identity.current !== undefined && identity.current !== subject) queryClient.clear();
    identity.current = subject;
    await adoptAccount(subject);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      let currentToken = storedToken();
      let needsRefresh = false;
      // Si no se puede refrescar por falta de red, se sigue con la sesión que ya había.
      let offlineUser: User | null = null;

      if (currentToken) {
        try {
          const decoded = jwtDecode<CustomJwtPayload>(currentToken);
          await synchronizeIdentity(currentToken);
          // Check if expired (with 10 seconds leeway)
          if (decoded.exp && decoded.exp * 1000 < Date.now() + 10000) {
            needsRefresh = true;
            offlineUser = userFromToken(currentToken);
          } else {
            setUser(userFromToken(currentToken));
          }
        } catch (err) {
          console.error('Token inválido', err);
          needsRefresh = true; // Try refreshing before giving up completely
        }
      } else {
        // No token at all, maybe user closed app with valid cookie? Try to proactive refresh just in case
        needsRefresh = true;
      }

      if (needsRefresh) {
        try {
          // Refresco directo (sin los interceptores de Axios, para evitar carreras al montar) y
          // coordinado con las demás pestañas: el refresh token rota en cada uso.
          currentToken = await refreshAcrossTabs(currentToken, async () => {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
            });
            if (res.status >= 500) throw new RefreshUnavailable('Refresh unavailable');
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            if (!data.token) throw new Error('No token in response');
            return data.token as string;
          });
          await synchronizeIdentity(currentToken);
          setToken(currentToken);
          setUser(userFromToken(currentToken));
        } catch (error) {
          if (offlineUser && refreshUnavailable(error)) {
            // Sin red (o con el servidor caído) la sesión no se pierde: se abre con el token
            // caducado y los datos guardados, y la primera petición que llegue lo renovará.
            setUser(offlineUser);
          } else {
            // Sin sesión válida: fuera token, datos en memoria y caché sin conexión.
            queryClient.clear();
            identity.current = undefined;
            setToken(null);
            setUser(null);
            await endLocalSession();
          }
        }
      }

      if (isMounted) setIsLoading(false);
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleTokenUpdate = () => {
      const refreshed = localStorage.getItem(TOKEN_KEY);
      if (refreshed) {
        void synchronizeIdentity(refreshed);
        setToken(refreshed);
      }
    };
    window.addEventListener('loopdeck:token-updated', handleTokenUpdate);
    return () => window.removeEventListener('loopdeck:token-updated', handleTokenUpdate);
  }, []);

  // Otra pestaña ha cambiado la sesión (el evento `storage` solo llega a las demás pestañas). Lo
  // que se hiciera aquí caería en la cuenta nueva con el token nuevo, así que esta pestaña la sigue.
  useEffect(() => {
    if (DEMO) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TOKEN_KEY) return;
      const current = localStorage.getItem(TOKEN_KEY);
      if (!current) {
        identity.current = undefined;
        queryClient.clear();
        setToken(null);
        setUser(null);
        return;
      }
      let subject: string | undefined;
      try {
        subject = jwtDecode<CustomJwtPayload>(current).sub;
      } catch {
        return;
      }
      if (identity.current !== undefined && identity.current !== subject) {
        // Otra cuenta: lo que hay en pantalla es de la anterior, así que se vuelve al inicio.
        void synchronizeIdentity(current).then(() => {
          setToken(current);
          window.location.href = '/';
        });
        return;
      }
      void synchronizeIdentity(current);
      setToken(current);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync token state for subsequent changes (e.g. login/logout)
  useEffect(() => {
    if (token && !isLoading) {
      try {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        setUser({
          id: decoded.sub || '',
          email: decoded.email || '',
          name: decoded.name || 'User',
          picture: decoded.picture || undefined,
        });
      } catch {
        logout();
      }
    } else if (!token && !isLoading) {
      setUser(null);
    }
  }, [token, isLoading]);

  const login = (jwtToken: string) => {
    queryClient.clear();
    void synchronizeIdentity(jwtToken);
    localStorage.setItem(TOKEN_KEY, jwtToken);
    setToken(jwtToken);
  };

  // Lo local se borra primero y sin esperar a la red: si la navegación corta lo que sigue, la
  // sesión ya está cerrada en este navegador. Después se anula la cookie de refresco en el servidor.
  const logout = async () => {
    if (DEMO) {
      window.location.href = '/';
      return;
    }
    const cleared = endLocalSession(); // quita el token ya, de forma síncrona
    identity.current = undefined;
    setToken(null);
    setUser(null);
    queryClient.clear();
    await cleared;
    try {
      googleLogout();
    } catch {
      // Local authentication is already cleared if the Google SDK is unavailable.
    }
    await revokeRefreshCookie();
  };

  const updateToken = (newToken: string) => {
    void synchronizeIdentity(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{ token, user, isLoading, login, logout, updateToken, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
