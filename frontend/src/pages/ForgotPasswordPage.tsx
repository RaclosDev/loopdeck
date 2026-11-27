import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import api from '../api/client';
import { AUTH_PATHS } from '../lib/authRedirect';
import AuthCard from './landing/AuthCard';

/** /recuperar: pide el correo con el enlace para elegir una contraseña nueva. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 429
          ? 'Demasiados intentos. Espera un rato e inténtalo de nuevo.'
          : 'No se ha podido enviar la petición. Revisa el correo e inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Recupera tu contraseña">
      {sent ? (
        <div className="flex w-full flex-col gap-3" role="status">
          <p>
            Si hay una cuenta con ese correo, te hemos enviado un enlace para elegir una contraseña
            nueva. Caduca en 30 minutos y solo sirve una vez.
          </p>
          <p className="fam-card__sub" style={{ margin: 0 }}>
            Si no llega, mira en el correo no deseado.
          </p>
          <p className="fam-card__switch">
            <Link className="fam-textlink" to={AUTH_PATHS.login}>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col gap-3">
          <p className="fam-card__sub" style={{ margin: 0 }}>
            Escribe el correo de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
          </p>
          <label htmlFor="forgot-email" className="fam-label">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
            className="fam-input"
          />
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
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </button>
          <p className="fam-card__switch">
            <Link className="fam-textlink" to={AUTH_PATHS.login}>
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
