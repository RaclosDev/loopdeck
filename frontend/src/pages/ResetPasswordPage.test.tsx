import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from './ResetPasswordPage';

const { post, auth } = vi.hoisted(() => ({
  post: vi.fn(),
  auth: { token: null as string | null },
}));
vi.mock('../api/client', () => ({ default: { post } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
      <Where />
    </MemoryRouter>,
  );

const choose = (password: string) => {
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
};

const badRequest = (data: unknown) =>
  new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    data,
    statusText: '',
    headers: {},
    config: {} as never,
  });

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.token = null;
    localStorage.clear();
  });

  it('cleans the token out of the URL and keeps it only in memory', async () => {
    renderAt('/reset-password?token=secreto-123');
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/reset-password$/),
    );
    expect(JSON.stringify({ ...localStorage })).not.toContain('secreto-123');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secreto-123');
  });

  it('sends the token read from the link with the new password and confirms the change', async () => {
    post.mockResolvedValue({ status: 204 });
    renderAt('/reset-password?token=secreto-123');
    choose('clave-nueva-1');
    expect(await screen.findByRole('heading', { name: 'Contraseña cambiada' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/auth/password-reset/confirm', {
      token: 'secreto-123',
      newPassword: 'clave-nueva-1',
    });
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Iniciar sesión' }),
    ).toHaveAttribute('href', '/login');
  });

  it('rejects a too short password without calling the server', async () => {
    renderAt('/reset-password?token=abc');
    fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: 'corta' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Cambiar contraseña' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 6 caracteres');
    expect(post).not.toHaveBeenCalled();
  });

  it('shows the server message for an expired or used link and offers a new one', async () => {
    post.mockRejectedValue(
      badRequest({ error: 'El enlace ha caducado o ya se ha usado. Pide uno nuevo' }),
    );
    renderAt('/reset-password?token=abc');
    choose('clave-nueva-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('El enlace ha caducado');
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
  });

  it('shows a generic error when the failure has no message', async () => {
    post.mockRejectedValue(new Error('red'));
    renderAt('/reset-password?token=abc');
    choose('clave-nueva-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cambiar');
  });

  it('says the link is not valid when there is no token', () => {
    renderAt('/reset-password');
    expect(screen.getByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('closes a session left in this browser and goes to the login after the change', async () => {
    auth.token = 'sesion-vieja';
    localStorage.setItem('loopdeck_jwt_token', 'sesion-vieja');
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '/reset-password' },
      writable: true,
    });
    vi.stubGlobal('caches', { delete: vi.fn().mockResolvedValue(true) });
    post.mockResolvedValue({ status: 204 });
    try {
      renderAt('/reset-password?token=abc');
      choose('clave-nueva-1');
      await waitFor(() => expect(window.location.href).toBe('/login'));
      expect(localStorage.getItem('loopdeck_jwt_token')).toBeNull();
    } finally {
      Object.defineProperty(window, 'location', { value: realLocation, writable: true });
      vi.unstubAllGlobals();
    }
  });
});
