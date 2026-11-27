import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adoptAccount,
  clearOfflineApiCache,
  isOfflineCacheable,
  API_CACHE_NAME,
} from './offlineCache';

describe('clearOfflineApiCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes the API cache of the service worker', async () => {
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: remove });
    await clearOfflineApiCache();
    expect(remove).toHaveBeenCalledWith(API_CACHE_NAME);
  });

  it('never throws when CacheStorage fails or is missing', async () => {
    vi.stubGlobal('caches', { delete: vi.fn().mockRejectedValue(new Error('denied')) });
    await expect(clearOfflineApiCache()).resolves.toBeUndefined();
    vi.stubGlobal('caches', undefined);
    await expect(clearOfflineApiCache()).resolves.toBeUndefined();
  });
});

describe('isOfflineCacheable', () => {
  it('allows only decks, their stats and their notes', () => {
    for (const path of [
      '/api/decks',
      '/api/decks/stats',
      '/api/decks/d1/notes',
      '/api/decks/d1/notes/page',
      '/api/decks/d1/notes/tags',
      '/api/decks/d1/card-states',
    ])
      expect(isOfflineCacheable(path), path).toBe(true);
  });

  it('never stores the study queue, exports, documents, passkeys, profile, AI or auth', () => {
    for (const path of [
      '/api/decks/d1/study',
      '/api/decks/d1/study/batch',
      '/api/study/prepare',
      '/api/users/me/export',
      '/api/users/me',
      '/api/users/me/passkeys',
      '/api/decks/d1/document',
      '/api/decks/d1/document/info',
      '/api/ai/definition',
      '/api/auth/refresh',
      '/api/templates',
      '/api//decks',
      '/api/decks/',
      '/api/decks/d1',
      '/api/decks/d1/notes/extra',
    ])
      expect(isOfflineCacheable(path), path).toBe(false);
  });
});

describe('adoptAccount', () => {
  const remove = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    localStorage.clear();
    remove.mockClear();
    vi.stubGlobal('caches', { delete: remove });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the cache for the same account and wipes it when the account changes', async () => {
    await adoptAccount('a');
    remove.mockClear();
    expect(await adoptAccount('a')).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    expect(await adoptAccount('b')).toBe(true);
    expect(remove).toHaveBeenCalledWith(API_CACHE_NAME);
    expect(localStorage.getItem('loopdeck_last_sub')).toBe('b');
  });

  it('wipes the cache when this browser has no record of a previous account', async () => {
    expect(await adoptAccount('a')).toBe(true);
    expect(remove).toHaveBeenCalledWith(API_CACHE_NAME);
  });
});
