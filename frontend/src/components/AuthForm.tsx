import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import api from '../api/client';
import { passkeysApi } from '../services/api';
import { isPasskeyCancel, passkeysSupported } from '../lib/webauthn';
import { useAuth } from '../context/AuthContext';
import { AUTH_PATHS } from '../lib/authRedirect';

export type AuthMode = 'login' | 'register';

/**
 * Formulario de acceso (email o Google) para la tarjeta común. El modo lo decide la ruta
 * (/login o /registro): la línea de cambio solo avisa con onModeChange para que cambie la URL.
 */
export default function AuthForm({
  googleEnabled = false,
  mode,
  onModeChange,
}: {
  googleEnabled?: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ token?: string }>('/auth/google', { credential });
      if (!res.data.token) throw new Error('Invalid authentication response');
      login(res.data.token);
    } finally {
      setLoading(false);
    }
  };
  const handlePasskey = async () => {
    setError('');
    setLoading(true);
    try {
      login(await passkeysApi.login());
    } catch (err) {
      if (!isPasskeyCancel(err)) {
        setError(
          'No se ha podido entrar con la llave de acceso. Prueba con tu email y contraseña.',
        );
      }
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register' && form.name.trim().length < 2) {
        setError('El nombre debe tener al menos 2 caracteres');
        return;
      }
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const res = await api.post(`/auth/${mode}`, payload);
      login(res.data.token);
    } catch {
      setError(
        mode === 'login'
          ? 'No se ha podido iniciar sesión. Revisa tus datos e inténtalo de nuevo.'
          : 'No se ha podido crear la cuenta. Revisa tus datos e inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };
  const registering = mode === 'register';
  const switchMode = () => {
    setError('');
    onModeChange(registering ? 'login' : 'register');
  };
  return (
    <div className="flex w-full flex-col gap-3">
      {googleEnabled && (
        <>
          <GoogleSignInButton onCredential={handleGoogleSuccess} />
          <p className="fam-divider">o con tu email</p>
        </>
      )}
      <form onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col gap-3">
        {registering && (
          <>
            <label htmlFor="auth-name" className="fam-label">
              Tu nombre
            </label>
            <input
              id="auth-name"
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              className="fam-input"
            />
          </>
        )}
        <label htmlFor="auth-email" className="fam-label">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          required
          className="fam-input"
        />
        <div className="fam-field-head">
          <label htmlFor="auth-password" className="fam-label">
            Contraseña
          </label>
          {!registering && (
            <Link className="fam-textlink fam-textlink--sm" to={AUTH_PATHS.forgot}>
              ¿Has olvidado la contraseña?
            </Link>
          )}
        </div>
        <div className="fam-password">
          <input
            id="auth-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={handleChange}
            required
            minLength={registering ? 6 : 1}
            className="fam-input"
            placeholder={registering ? 'Mínimo 6 caracteres' : undefined}
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
            {error}
          </p>
        )}
        <button
          type="submit"
          className="fam-btn fam-btn--ink fam-btn--block fam-btn--lg mt-1"
          disabled={loading}
        >
          {loading ? 'Cargando…' : registering ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
      </form>
      {!registering && passkeysSupported() && (
        <button
          type="button"
          className="fam-btn fam-btn--block"
          disabled={loading}
          onClick={() => void handlePasskey()}
        >
          <KeyRound size={18} aria-hidden="true" />
          Entrar con huella o llave de acceso
        </button>
      )}
      <p className="fam-card__switch">
        {registering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <button type="button" className="fam-textlink" onClick={switchMode}>
          {registering ? 'Inicia sesión' : 'Crea una gratis'}
        </button>
      </p>
    </div>
  );
}
