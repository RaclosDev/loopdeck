/**
 * LoopDeck — Auth Store (Zustand)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = '/api';

async function authRequest(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Server returned HTTP ${res.status}: ${text.substring(0, 50)}`);
  }
  
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status} Error`);
  return data;
}

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await authRequest('/auth/login', { email, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        localStorage.setItem('ff_token', data.token);
      },

      register: async (email, name, password) => {
        const data = await authRequest('/auth/register', { email, name, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        localStorage.setItem('ff_token', data.token);
      },

      updateUser: (userData) => {
        set({ user: userData });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('ff_token');
      },
    }),
    {
      name: 'ff-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('ff_token', state.token);
        }
      },
    }
  )
);

export default useAuthStore;
