import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicRoutes, RedirectFromAuth } from './authRoutes';

vi.mock('../pages/LandingPage', () => ({ default: () => <h1>Portada</h1> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <h1>Entrar</h1> }));
vi.mock('../pages/RegisterPage', () => ({ default: () => <h1>Registro</h1> }));
vi.mock('../pages/ForgotPasswordPage', () => ({ default: () => <h1>Recuperar</h1> }));
vi.mock('../pages/ResetPasswordPage', () => ({ default: () => <h1>Nueva contraseña</h1> }));

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PublicRoutes googleEnabled={false} />
      <Where />
    </MemoryRouter>,
  );

describe('public routes', () => {
  it.each([
    ['/', 'Portada'],
    ['/login', 'Entrar'],
    ['/registro', 'Registro'],
    ['/recuperar', 'Recuperar'],
    ['/reset-password?token=abc', 'Nueva contraseña'],
  ])('%s renders its own page', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('sends a private route to /login remembering where to go back', () => {
    renderAt('/hub/7?tab=quiz');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Fhub%2F7%3Ftab%3Dquiz');
  });
});

describe('auth routes with a session', () => {
  const renderSignedIn = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<RedirectFromAuth />} />
          <Route path="/registro" element={<RedirectFromAuth />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it('goes to the validated next route', () => {
    renderSignedIn('/login?next=%2Fstats');
    expect(screen.getByTestId('where')).toHaveTextContent('/stats');
  });

  it('ignores external next targets', () => {
    renderSignedIn('/registro?next=%2F%2Fevil.example');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });
});
