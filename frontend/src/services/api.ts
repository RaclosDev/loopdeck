import {
  Deck,
  DeckStats,
  NotePage,
  StudyBatch,
  PreparedStudy,
  Card,
  Note,
  UserDto,
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

import api from '../api/client';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const authApi = {
  me: async (): Promise<UserDto> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

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
  getDocumentUrl: (id: string): string => {
    const token = localStorage.getItem('loopdeck_jwt_token');
    return `${API_BASE}/decks/${id}/document?token=${token}`;
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
  chat: async (prompt: string, context?: string): Promise<AiChatResponse> => {
    const res = await api.post('/ai/chat', { prompt, context } as AiChatPayload);
    return res.data;
  },
  massDefine: async (words: string): Promise<unknown> => {
    const res = await api.post('/ai/mass-define', { words } as AiMassDefinePayload);
    return res.data;
  },
};

export const usersApi = {
  dailyLogin: async (): Promise<UserDto> => {
    const res = await api.post('/users/daily-login');
    return res.data;
  },
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
