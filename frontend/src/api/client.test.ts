import type { AxiosAdapter, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './client';

const respond = (config: Parameters<AxiosAdapter>[0], status: number) => {
  const response = { status, data: {}, config, headers: {}, statusText: '' } as AxiosResponse;
  if (status < 400) return Promise.resolve(response);
  return Promise.reject(new AxiosError('failed', 'ERR_BAD_REQUEST', config, undefined, response));
};

describe('api client session handling', () => {
  const remove = vi.fn().mockResolvedValue(true);
  const original = api.defaults.adapter;
  const realLocation = window.location;
  beforeEach(() => {
    remove.mockClear();
    vi.stubGlobal('caches', { delete: remove });
    Object.defineProperty(window, 'location', { value: { href: '/decks' }, writable: true });
    localStorage.setItem('loopdeck_jwt_token', 'old-token');
  });
  afterEach(() => {
    api.defaults.adapter = original;
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('clears the token and the offline cache when the refresh is rejected', async () => {
    api.defaults.adapter = (config) => respond(config, 401);
    await expect(api.get('/decks')).rejects.toBeTruthy();
    expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
    expect(remove).toHaveBeenCalledWith('api-cache');
    expect(window.location.href).toBe('/');
  });

  it('does not try to refresh (and so cannot revive a closed session) without a token', async () => {
    localStorage.removeItem('loopdeck_jwt_token');
    const calls: string[] = [];
    api.defaults.adapter = (config) => {
      calls.push(String(config.url));
      return respond(config, 401);
    };
    await expect(api.get('/decks')).rejects.toBeTruthy();
    expect(calls).toEqual(['/decks']);
  });
});
