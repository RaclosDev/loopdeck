/**
 * LoopDeck — Auth Store (Zustand)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDto, AuthResponse } from '../types';

const API_BASE = '/api';

async function authRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let data: Record<string, unknown> = {};
    try {
      const text = await response.text();
      if (text) data = JSON.parse(text);
    } catch {}
    throw new Error((data.error as string) || (data.message as string) || `HTTP ${response.status}`);
  }

  const text = await response.text();
  return JSON.parse(text);
}

export interface AuthStoreState {
  user: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, name: string, password?: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  updateUser: (userData: UserDto) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password?: string) => {
        const data = await authRequest<AuthResponse>('/auth/login', { email, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        localStorage.setItem('loopdeck_token', data.token);
      },

      register: async (email: string, name: string, password?: string) => {
        const data = await authRequest<AuthResponse>('/auth/register', { email, name, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        localStorage.setItem('loopdeck_token', data.token);
      },

      googleLogin: async (credential: string) => {
        const data = await authRequest<AuthResponse>('/auth/google', { credential });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        localStorage.setItem('loopdeck_token', data.token);
      },

      updateUser: (userData: UserDto) => {
        set({ user: userData });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('loopdeck_token');
      },
    }),
    {
      name: 'loopdeck_auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('loopdeck_token', state.token);
        }
      },
    }
  )
);

export default useAuthStore;
