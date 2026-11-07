import { clearOfflineApiCache, API_CACHE_NAME } from './offlineCache';

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
