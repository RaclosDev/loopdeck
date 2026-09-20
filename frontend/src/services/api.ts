import {
  Deck,
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
  AiMassDefinePayload
} from '../types';

import api from '../api/client';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const authApi = {
  me: async (): Promise<UserDto> => {
    const res = await api.get('/auth/me');
    return res.data;
  }
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
  uploadDocument: async (id: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/decks/${id}/document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res;
  },
  hasDocument: async (id: string): Promise<{ hasDocument: boolean }> => {
    const res = await api.get(`/decks/${id}/document/info`);
    return res.data;
  },
  getDocumentUrl: (id: string): string => {
    const token = localStorage.getItem('loopdeck_jwt_token');
    return `${API_BASE}/decks/${id}/document?token=${token}`;
  },
  getStats: async (): Promise<Record<string, { newCount: number, learningCount: number, reviewCount: number, totalCount: number }>> => {
    const res = await api.get('/decks/stats');
    return res.data;
  }
};

export const notesApi = {
  getByDeck: async (deckId: string): Promise<Note[]> => {
    const res = await api.get(`/decks/${deckId}/notes`);
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
  importBulk: async (deckId: string, dataList: ImportNoteBody[]): Promise<void> => {
    await api.post(`/decks/${deckId}/import`, dataList);
  },
};

export const studyApi = {
  getDueCards: async (deckId: string, limit: number = 20): Promise<DueCardDto[]> => {
    const res = await api.get(`/decks/${deckId}/study?limit=${limit}`);
    return res.data;
  },
  reviewCard: async (cardId: string, data: ReviewBody): Promise<{ card: Card }> => {
    const res = await api.post(`/cards/${cardId}/review`, data);
    return res.data;
  },
  restoreCard: async (cardId: string, cardState: Card): Promise<{ card: Card }> => {
    const res = await api.post(`/cards/${cardId}/restore`, cardState);
    return res.data;
  }
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
  massDefine: async (words: string): Promise<string> => {
    const res = await api.post('/ai/mass-define', { words } as AiMassDefinePayload);
    return res.data;
  }
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
