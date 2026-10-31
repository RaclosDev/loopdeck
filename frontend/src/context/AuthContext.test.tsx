import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }) } }));
vi.mock('@react-oauth/google', () => ({ googleLogout: vi.fn() }));
const tokenFor = (id: string) => `e30.${btoa(JSON.stringify({ sub: id, exp: 4102444800 }))}.test`;
let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return <span>{auth.user?.id || 'signed-out'}</span>;
}

describe('account data isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('loopdeck_jwt_token', tokenFor('a'));
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
});
