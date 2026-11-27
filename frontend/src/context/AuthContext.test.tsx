import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@react-oauth/google', () => ({ googleLogout: vi.fn() }));
const tokenFor = (id: string) => `e30.${btoa(JSON.stringify({ sub: id, exp: 4102444800 }))}.test`;
let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return <span>{auth.user?.id || 'signed-out'}</span>;
}

const mount = (client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

describe('account data isolation', () => {
  const removeCache = vi.fn().mockResolvedValue(true);
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('loopdeck_jwt_token', tokenFor('a'));
    localStorage.setItem('loopdeck_last_sub', 'a');
    removeCache.mockClear();
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal('caches', { delete: removeCache });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('wipes the offline cache when logging in as another account but not as the same one', async () => {
    mount();
    await screen.findByText('a');
    expect(removeCache).not.toHaveBeenCalled();
    act(() => auth.login(tokenFor('a')));
    expect(removeCache).not.toHaveBeenCalled();
    act(() => auth.login(tokenFor('b')));
    await waitFor(() => expect(removeCache).toHaveBeenCalledWith('api-cache'));
    expect(localStorage.getItem('loopdeck_last_sub')).toBe('b');
  });
  it('wipes the offline cache at startup when the last account in this browser was another', async () => {
    localStorage.setItem('loopdeck_last_sub', 'someone-else');
    mount();
    await screen.findByText('a');
    expect(removeCache).toHaveBeenCalledWith('api-cache');
  });
  it('wipes token and offline cache when the session cannot be recovered at startup', async () => {
    localStorage.setItem('loopdeck_jwt_token', 'not-a-jwt');
    fetchMock.mockResolvedValue({ ok: false });
    mount();
    await screen.findByText('signed-out');
    expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
    expect(removeCache).toHaveBeenCalledWith('api-cache');
  });
  it('logout clears the local session first and does not hang on a stuck server request', async () => {
    mount();
    await screen.findByText('a');
    fetchMock.mockReturnValue(new Promise(() => {}));
    vi.useFakeTimers();
    let finished = false;
    let request!: Promise<void>;
    act(() => {
      request = auth.logout().then(() => {
        finished = true;
      });
    });
    expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(removeCache).toHaveBeenCalledWith('api-cache');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    );
    expect(finished).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      await request;
    });
    expect(finished).toBe(true);
    vi.useRealTimers();
    await screen.findByText('signed-out');
  });
  it('drops the previous account data when logging in as another user', async () => {
    const client = new QueryClient();
    client.setQueryData(['decks', 'a'], ['private-a']);
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('a');
    act(() => auth.login(tokenFor('b')));
    await screen.findByText('b');
    expect(client.getQueryData(['decks', 'a'])).toBeUndefined();
  });
  it('clears cached user data on logout and retains data on same-user refresh', async () => {
    const client = new QueryClient();
    client.setQueryData(['deckStats', 'a'], { private: true });
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('a');
    act(() => auth.updateToken(tokenFor('a')));
    expect(client.getQueryData(['deckStats', 'a'])).toEqual({ private: true });
    await act(() => auth.logout());
    await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(0));
  });

  describe('startup with an expired token', () => {
    const expired = (id: string) => `e30.${btoa(JSON.stringify({ sub: id, exp: 1000 }))}.test`;
    beforeEach(() => localStorage.setItem('loopdeck_jwt_token', expired('a')));

    it('keeps the session when there is no network to refresh it', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      mount();
      await screen.findByText('a');
      expect(localStorage.getItem('loopdeck_jwt_token')).toBe(expired('a'));
      expect(removeCache).not.toHaveBeenCalled();
    });

    it('keeps the session when the server is down (5xx) or too slow', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 503 });
      const first = mount();
      await screen.findByText('a');
      expect(localStorage.getItem('loopdeck_jwt_token')).toBe(expired('a'));
      first.unmount();
      fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
      mount();
      await screen.findByText('a');
      expect(localStorage.getItem('loopdeck_jwt_token')).toBe(expired('a'));
    });

    it('still signs out when the server rejects the refresh (401)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401 });
      mount();
      await screen.findByText('signed-out');
      expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
      expect(removeCache).toHaveBeenCalledWith('api-cache');
    });

    it('puts a maximum time on the startup refresh', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401 });
      mount();
      await screen.findByText('signed-out');
      const options = fetchMock.mock.calls[0][1] as { signal?: AbortSignal };
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('another tab changes the session', () => {
    const realLocation = window.location;
    beforeEach(() => {
      Object.defineProperty(window, 'location', { value: { href: '/decks' }, writable: true });
    });
    afterEach(() => {
      Object.defineProperty(window, 'location', { value: realLocation, writable: true });
    });
    const fromOtherTab = (token: string | null) => {
      if (token) localStorage.setItem('loopdeck_jwt_token', token);
      else localStorage.removeItem('loopdeck_jwt_token');
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: 'loopdeck_jwt_token' }));
      });
    };

    it('signs this tab out when the session is closed in another one', async () => {
      const client = new QueryClient();
      client.setQueryData(['decks', 'a'], ['private-a']);
      mount(client);
      await screen.findByText('a');
      fromOtherTab(null);
      await screen.findByText('signed-out');
      expect(client.getQueryData(['decks', 'a'])).toBeUndefined();
    });

    it('drops the old account data and goes back to the start when another account signs in', async () => {
      const client = new QueryClient();
      client.setQueryData(['decks', 'a'], ['private-a']);
      mount(client);
      await screen.findByText('a');
      fromOtherTab(tokenFor('b'));
      await screen.findByText('b');
      await waitFor(() => expect(window.location.href).toBe('/'));
      expect(client.getQueryData(['decks', 'a'])).toBeUndefined();
    });

    it('follows a refreshed token of the same account without leaving the page', async () => {
      const client = new QueryClient();
      client.setQueryData(['decks', 'a'], ['private-a']);
      mount(client);
      await screen.findByText('a');
      fromOtherTab(`${tokenFor('a')}x`);
      expect(window.location.href).toBe('/decks');
      expect(client.getQueryData(['decks', 'a'])).toEqual(['private-a']);
      expect(auth.token).toBe(`${tokenFor('a')}x`);
    });
  });
});
