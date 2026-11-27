import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAcrossTabs } from './refreshLock';

const jwt = (exp: number, sub = 'a') => `e30.${btoa(JSON.stringify({ sub, exp }))}.test`;
const FRESH = jwt(4102444800);
const FRESH_OTHER = jwt(4102444801);
const EXPIRED = jwt(1000);

describe('refreshAcrossTabs', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('refreshes and stores the token when nobody else has', async () => {
    const refresh = vi.fn().mockResolvedValue(FRESH);
    await expect(refreshAcrossTabs(EXPIRED, refresh)).resolves.toBe(FRESH);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('loopdeck_jwt_token')).toBe(FRESH);
  });

  it('reuses a fresh token that another tab stored meanwhile', async () => {
    localStorage.setItem('loopdeck_jwt_token', FRESH_OTHER);
    const refresh = vi.fn();
    await expect(refreshAcrossTabs(EXPIRED, refresh)).resolves.toBe(FRESH_OTHER);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes when the stored token is still the stale one', async () => {
    localStorage.setItem('loopdeck_jwt_token', EXPIRED);
    const refresh = vi.fn().mockResolvedValue(FRESH);
    await refreshAcrossTabs(EXPIRED, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the other tab left an already expired token', async () => {
    localStorage.setItem('loopdeck_jwt_token', jwt(2000));
    const refresh = vi.fn().mockResolvedValue(FRESH);
    await refreshAcrossTabs(EXPIRED, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores a malformed stored token', async () => {
    localStorage.setItem('loopdeck_jwt_token', 'basura');
    const refresh = vi.fn().mockResolvedValue(FRESH);
    await refreshAcrossTabs(null, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not store anything when the refresh is rejected', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('401'));
    await expect(refreshAcrossTabs(EXPIRED, refresh)).rejects.toThrow('401');
    expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
  });

  it('serialises two tabs through Web Locks so the second one reuses the first token', async () => {
    let queue: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_name: string, callback: () => Promise<string>) => {
      const run = queue.then(callback);
      queue = run.catch(() => undefined);
      return run;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    const refresh = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return FRESH;
    });

    const [one, two] = await Promise.all([
      refreshAcrossTabs(EXPIRED, refresh),
      refreshAcrossTabs(EXPIRED, refresh),
    ]);

    expect(one).toBe(FRESH);
    expect(two).toBe(FRESH);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('loopdeck-refresh', expect.any(Function));
  });
});
