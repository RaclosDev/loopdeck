/**
 * LoopDeck — API Service
 * HTTP client for communicating with the Spring Boot backend.
 */
import {
  Deck,
  Card,
  Note,
  UserDto,
  AuthResponse,
  DeckCreateBody,
  DeckUpdateBody,
  NoteCreateBody,
  NoteUpdateBody,
  ReviewBody,
  ImportNoteBody,
  DueCardDto,
  TemplateDeck,
  AiChatResponse,
  AiChatPayload,
  AiMassDefinePayload
} from '../types';

// En dev: usa proxy de Vite (/api → localhost:8080)
// En prod: usa VITE_API_URL (URL del backend en Railway)
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('loopdeck_token');
  if (token && config.headers) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  // If token expired or is invalid, auto-logout
  if (response.status === 401 || response.status === 403) {
    // Only auto-logout if we had a token (i.e. we were "logged in")
    if (token) {
      // Use Zustand store dynamically to avoid circular dependencies
      import('../store/useAuthStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().logout();
        window.location.href = '/auth';
      });
    }
    throw new ApiError('Sesión expirada', response.status, {});
  }

  if (!response.ok) {
    let data: any = {};
    try {
      const text = await response.text();
      if (text) data = JSON.parse(text);
    } catch {}
    throw new ApiError(
      data.error || data.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }

  // Handle 204 No Content
  if (response.status === 204) return null as any;

  // Safely handle empty response bodies (e.g. 200 OK with no body)
  const text = await response.text();
  if (!text) return null as any;
  return JSON.parse(text);
}

// ── Auth ──────────────────────────────────────────────────────

export const authApi = {
  me: (): Promise<UserDto> => request<UserDto>('/auth/me'),
  googleLogin: (credential: string): Promise<AuthResponse> => request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
};

// ── Decks ─────────────────────────────────────────────────────

export const decksApi = {
  getAll: (): Promise<Deck[]> => request<Deck[]>('/decks'),
  create: (data: DeckCreateBody): Promise<Deck> => request<Deck>('/decks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: DeckUpdateBody): Promise<Deck> => request<Deck>(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string): Promise<void> => request<void>(`/decks/${id}`, { method: 'DELETE' }),
  uploadDocument: async (id: string, file: File): Promise<Response> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/decks/${id}/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('loopdeck_token')}`
      },
      body: formData
    });
    if (!res.ok) throw new Error('Error al subir el archivo');
    return res;
  },
  hasDocument: (id: string): Promise<{ hasDocument: boolean }> => request<{ hasDocument: boolean }>(`/decks/${id}/document/info`),
  getDocumentUrl: (id: string): string => `${API_BASE}/decks/${id}/document?token=${localStorage.getItem('loopdeck_token')}`
};

// ── Notes ─────────────────────────────────────────────────────

export const notesApi = {
  getByDeck: (deckId: string): Promise<Note[]> => request<Note[]>(`/decks/${deckId}/notes`),
  create: (data: NoteCreateBody): Promise<Note> => request<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: NoteUpdateBody): Promise<Note> => request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string): Promise<void> => request<void>(`/notes/${id}`, { method: 'DELETE' }),
  importBulk: (deckId: string, dataList: ImportNoteBody[]): Promise<void> => request<void>(`/decks/${deckId}/import`, { method: 'POST', body: JSON.stringify(dataList) }),
};

// ── Study ─────────────────────────────────────────────────────

export const studyApi = {
  getDueCards: (deckId: string, limit: number = 20): Promise<DueCardDto[]> => request<DueCardDto[]>(`/decks/${deckId}/study?limit=${limit}`),
  reviewCard: (cardId: string, data: ReviewBody): Promise<{ card: Card }> => request<{ card: Card }>(`/cards/${cardId}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ── Templates ─────────────────────────────────────────────────

export const templatesApi = {
  getAll: (): Promise<TemplateDeck[]> => request<TemplateDeck[]>('/templates'),
  import: (type: string): Promise<Deck> => request<Deck>(`/templates/import?type=${type}`, { method: 'POST' }),
};

export const aiApi = {
  chat: (prompt: string, context?: string): Promise<AiChatResponse> => request<AiChatResponse>('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt, context } as AiChatPayload) }),
  massDefine: (words: string): Promise<string> => request<string>('/ai/mass-define', { method: 'POST', body: JSON.stringify({ words } as AiMassDefinePayload) })
};

export const usersApi = {
  dailyLogin: (): Promise<UserDto> => request<UserDto>('/users/daily-login', { method: 'POST' }),
};

export default {
  auth: authApi,
  decks: decksApi,
  notes: notesApi,
  study: studyApi,
  templates: templatesApi,
  ai: aiApi,
  users: usersApi,
};
