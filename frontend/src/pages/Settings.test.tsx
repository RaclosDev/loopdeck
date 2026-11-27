import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';
import { queueReview, storedReviews } from '../lib/reviewOutbox';

const logout = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'a', email: 'a@x.test', name: 'A' }, logout }),
}));
vi.mock('../components/PasskeySettings', () => ({ default: () => null }));

describe('Settings logout', () => {
  const realLocation = window.location;
  beforeEach(() => {
    logout.mockReset();
    Object.defineProperty(window, 'location', { value: { href: '/ajustes' }, writable: true });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
  });

  it('waits for logout() to clear the session before navigating away', async () => {
    let finish!: () => void;
    logout.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    render(<Settings />);
    fireEvent.click(screen.getByText('Cuenta'));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar Sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/ajustes');
    await act(async () => finish());
    expect(window.location.href).toBe('/');
  });

  it('also empties the pending review outbox when the local data is cleared', async () => {
    globalThis.indexedDB = new IDBFactory();
    await queueReview({
      requestId: 'pending',
      account: 'a',
      deckId: 'deck',
      cardId: 'card',
      body: { rating: 3, timeTakenMs: 1, requestId: 'pending' },
    });
    logout.mockResolvedValue(undefined);
    render(<Settings />);
    fireEvent.click(screen.getByText('Cuenta'));
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar Caché Local' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar' }));
    await vi.waitFor(() => expect(window.location.href).toBe('/'));
    expect(await storedReviews('a')).toEqual([]);
  });
});
