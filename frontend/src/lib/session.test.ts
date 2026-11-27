import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endLocalSession, revokeRefreshCookie, TOKEN_KEY } from './session';

describe('endLocalSession', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('removes the token and the offline cache', async () => {
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: remove });
    localStorage.setItem(TOKEN_KEY, 'token');
    const done = endLocalSession();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await done;
    expect(remove).toHaveBeenCalledWith('api-cache');
  });
});

describe('revokeRefreshCookie', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts with keepalive and returns after the server answers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await revokeRefreshCookie();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    });
  });

  it('gives up on a request that never answers and swallows network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const stuck = revokeRefreshCookie(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(stuck).resolves.toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(revokeRefreshCookie()).resolves.toBeUndefined();
  });
});
