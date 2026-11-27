import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AUTH_PATHS } from '../lib/authRedirect';
import { endLocalSession } from '../lib/session';
import AuthCard from './landing/AuthCard';

const MIN_PASSWORD = 6;

/**
 * /reset-password?token=…: elige la contraseña nueva con el enlace del correo. El token se lee una
 * vez de la URL y se queda solo en memoria (estado del componente): la URL se limpia enseguida para
 * que no quede en el historial ni en la barra, y no se guarda en ningún almacenamiento.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { token: session } = useAuth();
  const [token] = useState(() => params.get('token')?.trim() ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigate({ pathname: AUTH_PATHS.reset, search: '' }, { replace: true });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: password });
      setPassword('');
      if (session) {
        // El servidor ya ha cerrado todas las sesiones: la de este navegador se limpia y se vuelve
        // a /login con la página recargada (si no, la app cambiaría de rutas y perdería esta pantalla).
        await endLocalSession();
        window.location.href = AUTH_PATHS.login;
        return;
      }
      setDone(true);
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(
        typeof message === 'string' && message
          ? message
          : 'No se ha podido cambiar la contraseña. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Contraseña cambiada">
        <div className="flex w-full flex-col gap-3" role="status">
          <p>
            Ya puedes entrar con la contraseña nueva. Por seguridad, se han cerrado las sesiones que
            hubiera abiertas.
          </p>
          <Link className="fam-btn fam-btn--ink fam-btn--block fam-btn--lg" to={AUTH_PATHS.login}>
            Iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard title="Enlace no válido">
        <div className="flex w-full flex-col gap-3">
          <p role="alert">Este enlace no es válido. Pide uno nuevo para cambiar la contraseña.</p>
          <Link className="fam-btn fam-btn--ink fam-btn--block fam-btn--lg" to={AUTH_PATHS.forgot}>
            Pedir un enlace nuevo
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Elige tu contraseña">
      <form onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col gap-3">
        <label htmlFor="reset-password" className="fam-label">
          Contraseña nueva
        </label>
        <div className="fam-password">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD}
            maxLength={100}
            className="fam-input"
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            className="fam-password__toggle"
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-[#b91c1c]">
            {error}{' '}
            <Link className="fam-textlink fam-textlink--sm" to={AUTH_PATHS.forgot}>
              Pedir un enlace nuevo
            </Link>
          </p>
        )}
        <button
          type="submit"
          className="fam-btn fam-btn--ink fam-btn--block fam-btn--lg mt-1"
          disabled={loading}
        >
          {loading ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </AuthCard>
  );
}
