import axios from 'axios';
import { DEMO } from '../demo/mode';
import { TOKEN_KEY, endLocalSession } from '../lib/session';
import { refreshAcrossTabs } from '../lib/refreshLock';

/** Tiempo máximo de una petición normal: sin él, una conexión colgada deja la pantalla esperando. */
export const REQUEST_TIMEOUT_MS = 30_000;
/** Para lo que tarda de verdad: llamadas a la IA y subida de documentos. */
export const SLOW_REQUEST_TIMEOUT_MS = 120_000;

const api = axios.create({
  baseURL: '/api',
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Modo demo: las peticiones las responde un backend ficticio en memoria.
if (DEMO) {
  api.defaults.adapter = async (config) => (await import('../demo/backend')).demoAdapter(config);
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    // Don't send token for specific auth routes to avoid Spring Security rejecting valid requests (like refresh) due to expired token
    if (
      token &&
      !config.url?.match(/\/auth\/(login|register|google|refresh|config|passkeys|password-reset)/)
    ) {
      config.headers.Authorization = 'Bearer ' + token;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not retry auth routes that don't need token or handle it themselves
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      // Sin token la sesión se cerró en este navegador: un refresco la resucitaría con la cookie.
      localStorage.getItem(TOKEN_KEY) &&
      !originalRequest.url.match(
        /\/auth\/(login|register|google|refresh|config|passkeys|password-reset)/,
      )
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // El token con el que falló la petición: si otra pestaña ya lo renovó, se usa el suyo.
        const usedToken = String(originalRequest.headers?.Authorization ?? '').replace(
          /^Bearer /,
          '',
        );
        const newToken = await refreshAcrossTabs(usedToken || null, async () => {
          const res = await api.post('/auth/refresh');
          return res.data.token as string;
        });

        window.dispatchEvent(new Event('loopdeck:token-updated'));
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (err: unknown) {
        processQueue(err, null);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          // Expulsión: token y caché sin conexión fuera antes de salir, como en «Cerrar sesión».
          await endLocalSession();
          window.location.href = '/';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
