import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';

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
});
