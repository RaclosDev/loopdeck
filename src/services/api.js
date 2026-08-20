/**
 * LoopDeck — API Service
 * HTTP client for communicating with the Spring Boot backend.
 */

// En dev: usa proxy de Vite (/api → localhost:8080)
// En prod: usa VITE_API_URL (URL del backend en Railway)
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('ff_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let data = {};
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
  if (response.status === 204) return null;

  // Safely handle empty response bodies (e.g. 200 OK with no body)
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

// ── Auth ──────────────────────────────────────────────────────

export const authApi = {
  me: () => request('/auth/me'),
};

// ── Decks ─────────────────────────────────────────────────────

export const decksApi = {
  getAll: () => request('/decks'),
  create: (data) => request('/decks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  uploadDocument: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/decks/${id}/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('ff_token')}`
      },
      body: formData
    });
    if (!res.ok) throw new Error('Error al subir el archivo');
    return res;
  },
  hasDocument: (id) => request(`/decks/${id}/document/info`),
  getDocumentUrl: (id) => `${API_BASE}/decks/${id}/document?token=${localStorage.getItem('ff_token')}`
};

// ── Notes ─────────────────────────────────────────────────────

export const notesApi = {
  getByDeck: (deckId) => request(`/decks/${deckId}/notes`),
  create: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  importBulk: (deckId, dataList) => request(`/decks/${deckId}/import`, { method: 'POST', body: JSON.stringify(dataList) }),
};

// ── Study ─────────────────────────────────────────────────────

export const studyApi = {
  getDueCards: (deckId, limit = 20) => request(`/decks/${deckId}/study?limit=${limit}`),
  reviewCard: (cardId, data) => request(`/cards/${cardId}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ── Templates ─────────────────────────────────────────────────

export const templatesApi = {
  getAll: () => request('/templates'),
  import: (type) => request(`/templates/import?type=${type}`, { method: 'POST' }),
};

export const aiApi = {
  chat: (prompt, context) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt, context }) }),
  massDefine: (words) => request('/ai/mass-define', { method: 'POST', body: JSON.stringify({ words }) })
};

export default {
  auth: authApi,
  decks: decksApi,
  notes: notesApi,
  study: studyApi,
  templates: templatesApi,
  ai: aiApi,
};

export const usersApi = {
  dailyLogin: () => request('/users/daily-login', { method: 'POST' }),
  buySkin: (skin, cost) => request('/users/buy-skin', { method: 'POST', body: JSON.stringify({ skin, cost: String(cost) }) }),
};
