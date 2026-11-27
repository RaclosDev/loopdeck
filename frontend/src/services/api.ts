import {
  Deck,
  DeckStats,
  NotePage,
  StudyBatch,
  PreparedStudy,
  Card,
  Note,
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
  AiMassDefinePayload,
} from '../types';

import api, { SLOW_REQUEST_TIMEOUT_MS } from '../api/client';
import { createPasskey, deviceName, getPasskey, type BrowserOptions } from '../lib/webauthn';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const decksApi = {
  getAll: async (): Promise<Deck[]> => {
    const res = await api.get('/decks');
    return res.data;
  },
  create: async (data: DeckCreateBody): Promise<Deck> => {
    const res = await api.post('/decks', data);
    return res.data;
  },
  update: async (id: string, data: DeckUpdateBody): Promise<Deck> => {
    const res = await api.put(`/decks/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/decks/${id}`);
  },
  uploadDocument: async (id: string, file: File): Promise<{ hasDocument: boolean }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ hasDocument: boolean }>(`/decks/${id}/document`, formData, {
      timeout: SLOW_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  hasDocument: async (id: string): Promise<{ hasDocument: boolean }> => {
    const res = await api.get(`/decks/${id}/document/info`);
    return res.data;
  },
  downloadDocument: async (id: string): Promise<Blob> => {
    const res = await api.get(`/decks/${id}/document`, { responseType: 'blob' });
    return res.data;
  },
  getStats: async (): Promise<Record<string, DeckStats>> => {
    const res = await api.get('/decks/stats');
    return res.data;
  },
  getCardStates: async (deckId: string): Promise<Record<string, string>> => {
    const res = await api.get(`/decks/${deckId}/card-states`);
    return res.data;
  },
};

export const accountApi = {
  /** Todos los datos de la cuenta en JSON, listos para descargar. */
  exportData: async (): Promise<Blob> => {
    const res = await api.get('/users/me/export', {
      responseType: 'blob',
      timeout: SLOW_REQUEST_TIMEOUT_MS,
    });
    return res.data;
  },
  /** Borra la cuenta y todos sus datos. No se puede deshacer. */
  deleteAccount: async (): Promise<void> => {
    await api.delete('/users/me');
  },
  /**
   * Cambia la contraseña. El servidor cierra las sesiones de los demás dispositivos y devuelve una
   * sesión nueva para este: hay que guardar su token.
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<string> => {
    const { data } = await api.put<{ token: string }>('/users/me/password', {
      currentPassword,
      newPassword,
    });
    return data.token;
  },
  /** Cierra la sesión de todos los dispositivos, también este. */
  logoutEverywhere: async (): Promise<void> => {
    await api.delete('/users/me/sessions');
  },
};

/**
 * Prueba de que quien tiene la sesión es el dueño de la cuenta, exigida para acciones sensibles: la
 * contraseña o, en las cuentas que solo entran con Google, una credencial reciente de Google.
 */
export type Reauth = { password: string } | { googleCredential: string };

/** Llave de acceso tal como se ve en los ajustes. */
export interface PasskeySummary {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Reto de WebAuthn: su id y las opciones para el navegador. */
export interface PasskeyCeremony {
  requestId: string;
  options: BrowserOptions;
}

export const passkeysApi = {
  list: async (): Promise<PasskeySummary[]> => (await api.get('/users/me/passkeys')).data,
  /** Pide al dispositivo una llave nueva y la guarda en la cuenta. */
  addOnThisDevice: async (reauth: Reauth): Promise<PasskeySummary> => {
    const { data } = await api.post<PasskeyCeremony>('/users/me/passkeys/options', reauth);
    const credential = await createPasskey(data.options);
    return (
      await api.post('/users/me/passkeys', {
        requestId: data.requestId,
        credential,
        name: deviceName(),
      })
    ).data;
  },
  /** Borra la llave y devuelve las que quedan. */
  remove: async (id: number): Promise<PasskeySummary[]> =>
    (await api.delete(`/users/me/passkeys/${id}`)).data,
  /** Entra con una llave del dispositivo y devuelve el token de la sesión. */
  login: async (): Promise<string> => {
    const { data } = await api.post<PasskeyCeremony>('/auth/passkeys/login/options');
    const credential = await getPasskey(data.options);
    const res = await api.post<{ token?: string }>('/auth/passkeys/login', {
      requestId: data.requestId,
      credential,
    });
    if (!res.data.token) throw new Error('Invalid authentication response');
    return res.data.token;
  },
};

export const notesApi = {
  getByDeck: async (deckId: string): Promise<Note[]> => {
    const res = await api.get(`/decks/${deckId}/notes`);
    return res.data;
  },
  getPage: async (
    deckId: string,
    page: number,
    search: string,
    tag: string,
    signal?: AbortSignal,
  ): Promise<NotePage> => {
    const res = await api.get<NotePage>(`/decks/${deckId}/notes/page`, {
      params: { page, size: 25, search, tag },
      signal,
    });
    return res.data;
  },
  getTags: async (deckId: string, signal?: AbortSignal): Promise<string[]> => {
    const res = await api.get<string[]>(`/decks/${deckId}/notes/tags`, { signal });
    return res.data;
  },
  create: async (data: NoteCreateBody): Promise<Note> => {
    const res = await api.post('/notes', data);
    return res.data;
  },
  update: async (id: string, data: NoteUpdateBody): Promise<Note> => {
    const res = await api.put(`/notes/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
  importBulk: async (
    deckId: string,
    dataList: ImportNoteBody[],
    requestId?: string,
  ): Promise<void> => {
    await api.post(`/decks/${deckId}/import`, dataList, {
      headers: requestId ? { 'Idempotency-Key': requestId } : undefined,
    });
  },
};

export const studyApi = {
  prepare: async (
    deckIds: string[],
    order: string,
    signal?: AbortSignal,
  ): Promise<Record<string, PreparedStudy>> => {
    const response = await api.post('/study/prepare', { deckIds, order }, { signal });
    return response.data;
  },
  getBatch: async (deckId: string, order: string, signal?: AbortSignal): Promise<StudyBatch> => {
    const res = await api.get<StudyBatch>(`/decks/${deckId}/study/batch`, {
      params: { limit: 50, order },
      signal,
    });
    return res.data;
  },
  getDueCards: async (deckId: string, limit: number = 20): Promise<DueCardDto[]> => {
    const res = await api.get(`/decks/${deckId}/study?limit=${limit}`);
    return res.data;
  },
  reviewCard: async (
    cardId: string,
    data: ReviewBody,
  ): Promise<{ card: Card; reviewId: string }> => {
    const res = await api.post(`/cards/${cardId}/review`, data);
    return res.data;
  },
  restoreCard: async (
    cardId: string,
    cardState: Card,
    reviewId?: string,
  ): Promise<{ card: Card; alreadyUndone: boolean }> => {
    const res = await api.post(`/cards/${cardId}/restore`, { ...cardState, reviewId });
    return res.data;
  },
};

export const templatesApi = {
  getAll: async (): Promise<TemplateDeck[]> => {
    const res = await api.get('/templates');
    return res.data;
  },
  import: async (type: string): Promise<Deck> => {
    const res = await api.post(`/templates/import?type=${type}`);
    return res.data;
  },
};

export const aiApi = {
  chat: async (prompt: string, context?: string, signal?: AbortSignal): Promise<AiChatResponse> => {
    const res = await api.post('/ai/chat', { prompt, context } as AiChatPayload, {
      timeout: SLOW_REQUEST_TIMEOUT_MS,
      signal,
    });
    return res.data;
  },
  massDefine: async (words: string): Promise<unknown> => {
    const res = await api.post('/ai/mass-define', { words } as AiMassDefinePayload, {
      timeout: SLOW_REQUEST_TIMEOUT_MS,
    });
    return res.data;
  },
};
