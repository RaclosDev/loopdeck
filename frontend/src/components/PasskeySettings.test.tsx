import { AxiosError } from 'axios';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import PasskeySettings from './PasskeySettings';
import { GoogleClientIdContext } from '../context/GoogleClientIdContext';
import { passkeysApi } from '../services/api';

vi.mock('../services/api', () => ({
  passkeysApi: { list: vi.fn(), addOnThisDevice: vi.fn(), remove: vi.fn() },
}));
vi.mock('../lib/webauthn', () => ({
  passkeysSupported: () => true,
  isPasskeyCancel: (err: unknown) => err instanceof DOMException && err.name === 'NotAllowedError',
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential?: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: 'id-token-de-google' })}>
      Continuar con Google
    </button>
  ),
}));

const saved = { id: 7, name: 'Mi móvil', createdAt: '2026-11-27T10:00:00Z', lastUsedAt: null };
const status = (code: number) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: code,
    statusText: '',
    headers: {},
    config: {} as never,
    data: {},
  });

function open(googleClientId: string | null = null) {
  render(
    <GoogleClientIdContext.Provider value={googleClientId}>
      <PasskeySettings />
    </GoogleClientIdContext.Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Añadir llave en este dispositivo' }));
}

const password = () => screen.getByLabelText('Contraseña') as HTMLInputElement;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(passkeysApi.list).mockResolvedValue([]);
});

describe('adding a passkey asks to confirm identity', () => {
  it('does not call the server until the password is typed', async () => {
    open();
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(passkeysApi.addOnThisDevice).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('sends the password, closes the dialog and reports success', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockResolvedValue(saved);
    open();
    fireEvent.change(password(), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() =>
      expect(passkeysApi.addOnThisDevice).toHaveBeenCalledWith({ password: 'secreta' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(toast.success).toHaveBeenCalled();
    expect(await screen.findByText('Mi móvil')).toBeTruthy();
  });

  it('on 403 keeps the dialog open with a clear message and clears the password', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockRejectedValue(status(403));
    open();
    fireEvent.change(password(), { target: { value: 'equivocada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('confirmar tu identidad');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(password().value).toBe('');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('on 429 tells the user to wait', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockRejectedValue(status(429));
    open();
    fireEvent.change(password(), { target: { value: 'otra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('lets the user try again after a 403', async () => {
    vi.mocked(passkeysApi.addOnThisDevice)
      .mockRejectedValueOnce(status(403))
      .mockResolvedValueOnce(saved);
    open();
    fireEvent.change(password(), { target: { value: 'mal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('alert');
    fireEvent.change(password(), { target: { value: 'bien' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(passkeysApi.addOnThisDevice).toHaveBeenLastCalledWith({ password: 'bien' });
  });

  it('closes and shows a generic error for any other failure', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockRejectedValue(status(500));
    open();
    fireEvent.change(password(), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes quietly when the user cancels the device prompt', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockRejectedValue(
      new DOMException('cancelado', 'NotAllowedError'),
    );
    open();
    fireEvent.change(password(), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('cancelling the dialog sends nothing and forgets the password', async () => {
    open();
    fireEvent.change(password(), { target: { value: 'secreta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(passkeysApi.addOnThisDevice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir llave en este dispositivo' }));
    expect(password().value).toBe('');
  });
});

describe('accounts that only sign in with Google', () => {
  it('offers no Google option when Google is not configured', async () => {
    open(null);
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).toBeNull();
  });

  it('confirms with a Google credential instead of a password', async () => {
    vi.mocked(passkeysApi.addOnThisDevice).mockResolvedValue(saved);
    open('client-id');
    await act(async () => fireEvent.click(await screen.findByText('Continuar con Google')));
    await waitFor(() =>
      expect(passkeysApi.addOnThisDevice).toHaveBeenCalledWith({
        googleCredential: 'id-token-de-google',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
