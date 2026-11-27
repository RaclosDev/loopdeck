import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from './ForgotPasswordPage';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../api/client', () => ({ default: { post } }));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/recuperar']}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for the email and shows the same neutral confirmation', async () => {
    post.mockResolvedValue({ status: 202, data: {} });
    renderPage();
    submit('  ana@example.com ');
    expect(await screen.findByRole('status')).toHaveTextContent('Si hay una cuenta con ese correo');
    expect(post).toHaveBeenCalledWith('/auth/password-reset/request', { email: 'ana@example.com' });
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('tells the user to wait when the rate limit answers 429', async () => {
    post.mockRejectedValue(
      new AxiosError('limit', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 429,
        data: {},
        statusText: '',
        headers: {},
        config: {} as never,
      }),
    );
    renderPage();
    submit('ana@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
  });

  it('shows a generic error for any other failure and keeps the form', async () => {
    post.mockRejectedValue(new Error('red'));
    renderPage();
    submit('ana@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido enviar');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled(),
    );
  });
});
