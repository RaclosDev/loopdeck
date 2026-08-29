import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';

const GOOGLE_CLIENT_ID = '498045926443-f4bjit64ge5b2uqcfbismjkuf61uob13.apps.googleusercontent.com';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuthStore();
  const googleBtnRef = useRef(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: googleBtnRef.current.offsetWidth,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
          });
        }
      }
    };

    // GSI script might not be loaded yet (async), so we retry
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.name.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
        await register(form.email, form.name, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <h1 className="auth-logo-text">LoopDeck</h1>
          <p className="auth-logo-sub">Spaced repetition, reimagined</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Crear cuenta
          </button>
        </div>

        {/* Google Sign-In Button */}
        <div ref={googleBtnRef} style={{ width: '100%', marginBottom: '1rem' }}></div>

        {/* Divider */}
        <div className="auth-divider">
          <span>o con email</span>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Nombre</label>
              <input
                id="auth-name"
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              name="password"
              placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={form.password}
              onChange={handleChange}
              required
              minLength={mode === 'register' ? 6 : 1}
              className="form-input"
            />
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            className="primary-btn"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-sm" />
            ) : (
              mode === 'login' ? 'Entrar' : 'Crear cuenta'
            )}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login'
            ? '¿No tienes cuenta? '
            : '¿Ya tienes cuenta? '}
          <button
            className="link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

