import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function GoogleLoginSection({
  onSuccess,
  onError,
}: {
  onSuccess: (token: string) => void;
  onError: (message: string) => void;
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: (response) => onSuccess(response.access_token),
    onError: () => onError('No se ha podido iniciar sesión con Google.'),
  });
  return (
    <>
      <button type="button" className="btn btn-secondary auth-google" onClick={() => googleLogin()}>
        Continuar con Google
      </button>
      <div className="auth-divider">o con tu email</div>
    </>
  );
}

export default function LoginPage({
  googleEnabled = false,
  embedded = false,
}: {
  googleEnabled?: boolean;
  embedded?: boolean;
}) {
  const Heading = embedded ? 'h2' : 'h1';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const handleGoogleSuccess = async (accessToken: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential: accessToken, token: accessToken });
      login(res.data.token);
    } catch {
      setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');
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
  return (
    <main className="auth-stage">
      <section className="auth-paper paper-panel landing-tape" aria-label="Acceso a LoopDeck">
        <Heading>LoopDeck</Heading>
        <p className="marker-ink">Un repaso más. Un poco más lejos.</p>
        <div className="paper-tabs" aria-label="Tipo de acceso">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Crear cuenta
          </button>
        </div>
        {googleEnabled && <GoogleLoginSection onSuccess={handleGoogleSuccess} onError={setError} />}
        <form onSubmit={handleSubmit} aria-busy={loading}>
          {mode === 'register' && (
            <label>
              Tu nombre
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
                className="form-input"
                placeholder="Tu nombre"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="tu@email.com"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={handleChange}
              required
              minLength={mode === 'register' ? 6 : 1}
              className="form-input"
              placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Contraseña'}
            />
          </label>
          {error && (
            <div role="alert" className="auth-error">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}
