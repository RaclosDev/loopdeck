import type { AxiosAdapter, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api, { REQUEST_TIMEOUT_MS, SLOW_REQUEST_TIMEOUT_MS } from './client';

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

  it('gives every request a maximum time and more room to the slow ones', async () => {
    const seen: (number | undefined)[] = [];
    api.defaults.adapter = (config) => {
      seen.push(config.timeout);
      return respond(config, 200);
    };
    await api.get('/decks');
    await api.get('/ai/chat', { timeout: SLOW_REQUEST_TIMEOUT_MS });
    expect(seen).toEqual([REQUEST_TIMEOUT_MS, SLOW_REQUEST_TIMEOUT_MS]);
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SLOW_REQUEST_TIMEOUT_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS);
  });

  it('renews the session with the rotated token and retries the request with it', async () => {
    const renewed = `e30.${btoa(JSON.stringify({ sub: 'a', exp: 4102444800 }))}.test`;
    const calls: string[] = [];
    const sent: (string | undefined)[] = [];
    api.defaults.adapter = (config) => {
      calls.push(String(config.url));
      if (config.url === '/auth/refresh') {
        const response = {
          status: 200,
          data: { token: renewed },
          config,
          headers: {},
          statusText: '',
        };
        return Promise.resolve(response as AxiosResponse);
      }
      sent.push(config.headers.Authorization as string | undefined);
      return sent.length === 1 ? respond(config, 401) : respond(config, 200);
    };
    await api.get('/decks');
    expect(calls).toEqual(['/decks', '/auth/refresh', '/decks']);
    expect(sent).toEqual(['Bearer old-token', `Bearer ${renewed}`]);
    expect(localStorage.getItem('loopdeck_jwt_token')).toBe(renewed);
  });

  it('uses the token another tab already renewed instead of spending the cookie again', async () => {
    const fresh = `e30.${btoa(JSON.stringify({ sub: 'a', exp: 4102444800 }))}.test`;
    const calls: string[] = [];
    let first = true;
    api.defaults.adapter = (config) => {
      calls.push(String(config.url));
      if (first) {
        first = false;
        // Mientras fallaba esta petición, otra pestaña renovó y guardó su token.
        localStorage.setItem('loopdeck_jwt_token', fresh);
        return respond(config, 401);
      }
      return respond(config, 200);
    };
    await api.get('/decks');
    expect(calls).toEqual(['/decks', '/decks']);
  });

  it('never attaches the session token to the password recovery calls', async () => {
    let header: unknown = 'unset';
    api.defaults.adapter = (config) => {
      header = config.headers.Authorization;
      return respond(config, 202);
    };
    await api.post('/auth/password-reset/request', { email: 'a@example.com' });
    expect(header).toBeUndefined();
  });

  it('does not run the refresh flow when the recovery call itself answers 401', async () => {
    const calls: string[] = [];
    api.defaults.adapter = (config) => {
      calls.push(String(config.url));
      return respond(config, 401);
    };
    await expect(api.post('/auth/password-reset/confirm', {})).rejects.toBeTruthy();
    expect(calls).toEqual(['/auth/password-reset/confirm']);
  });
});
