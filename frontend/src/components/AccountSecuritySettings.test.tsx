import { AxiosError } from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import AccountSecuritySettings from './AccountSecuritySettings';
import { accountApi } from '../services/api';

const logout = vi.fn();
const updateToken = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ logout, updateToken }) }));
vi.mock('../services/api', () => ({
  accountApi: { changePassword: vi.fn(), logoutEverywhere: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const status = (code: number) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: code,
    statusText: '',
    headers: {},
    config: {} as never,
    data: {},
  });

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

function fillPasswords(current: string, next: string, repeat = next) {
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  fireEvent.change(field('Contraseña actual'), { target: { value: current } });
  fireEvent.change(field('Contraseña nueva'), { target: { value: next } });
  fireEvent.change(field('Repite la contraseña nueva'), { target: { value: repeat } });
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }));

beforeEach(() => {
  vi.resetAllMocks();
  render(<AccountSecuritySettings />);
});

describe('changing the password', () => {
  it('sends both passwords, keeps the new session token and closes', async () => {
    vi.mocked(accountApi.changePassword).mockResolvedValue('jwt-nuevo');
    fillPasswords('vieja123', 'nueva456');
    submit();
    await waitFor(() => expect(updateToken).toHaveBeenCalledWith('jwt-nuevo'));
    expect(accountApi.changePassword).toHaveBeenCalledWith('vieja123', 'nueva456');
    expect(toast.success).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does not send a new password that is too short or does not match', () => {
    fillPasswords('vieja123', 'corta');
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 6 caracteres');
    fireEvent.change(field('Contraseña nueva'), { target: { value: 'nueva456' } });
    fireEvent.change(field('Repite la contraseña nueva'), { target: { value: 'otra4567' } });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('no coinciden');
    expect(accountApi.changePassword).not.toHaveBeenCalled();
  });

  it('says so when the current password is wrong and clears what was typed', async () => {
    vi.mocked(accountApi.changePassword).mockRejectedValue(status(403));
    fillPasswords('mala', 'nueva456');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('contraseña actual no es correcta');
    expect(field('Contraseña actual').value).toBe('');
    expect(field('Contraseña nueva').value).toBe('');
    expect(updateToken).not.toHaveBeenCalled();
  });

  it('explains the attempt limit', async () => {
    vi.mocked(accountApi.changePassword).mockRejectedValue(status(429));
    fillPasswords('mala', 'nueva456');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
  });

  it('explains that Google accounts have no password to change', async () => {
    vi.mocked(accountApi.changePassword).mockRejectedValue(status(409));
    fillPasswords('x', 'nueva456');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('entra con Google');
  });
});

describe('closing every session', () => {
  const realLocation = window.location;
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '/ajustes' }, writable: true });
  });

  it('asks the server, then ends the local session and leaves', async () => {
    vi.mocked(accountApi.logoutEverywhere).mockResolvedValue(undefined);
    logout.mockResolvedValue(undefined);
    fireEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar todas' }));
    await waitFor(() => expect(window.location.href).toBe('/'));
    expect(accountApi.logoutEverywhere).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
  });

  it('stays signed in and warns when the server cannot do it', async () => {
    vi.mocked(accountApi.logoutEverywhere).mockRejectedValue(status(500));
    fireEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar todas' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(logout).not.toHaveBeenCalled();
    Object.defineProperty(window, 'location', { value: realLocation, writable: true });
  });
});
