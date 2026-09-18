import { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [googleWidth, setGoogleWidth] = useState(320);

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setGoogleWidth(Math.min(width, 400));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { 
        token: credentialResponse.credential,
        credential: credentialResponse.credential
      });
      login(res.data.token, res.data.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        login(res.data.token, res.data.refreshToken);
      } else {
        if (form.name.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
        const res = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
        login(res.data.token, res.data.refreshToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error en auth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(rgba(8, 8, 12, 0.82), rgba(5, 5, 8, 0.90)), url(/login-bg.jpg) center/cover no-repeat fixed',
      color: 'var(--text-primary)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div 
        ref={containerRef}
        style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '2.5rem 2rem',
        borderRadius: '28px',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 133, 255, 0.1)',
        maxWidth: '400px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '22px',
          overflow: 'hidden',
          marginBottom: '1rem',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: '0 0 25px rgba(0, 133, 255, 0.45), 0 8px 24px rgba(0, 0, 0, 0.7)',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/loopdeck-icon-192.png" 
            alt="LoopDeck Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-0.05em' }}>
          <span style={{ color: 'var(--accent-primary)' }}>Loop</span><span style={{ color: 'var(--text-primary)' }}>Deck</span>
        </h1>

        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.95rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Spaced repetition, reimagined.
        </p>

        <div style={{ 
          display: 'flex', 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '0.35rem', 
          borderRadius: '20px', 
          marginBottom: '1.5rem',
          width: '100%'
        }}>
          <button 
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{ 
              flex: 1, padding: '0.65rem', borderRadius: '16px', border: 'none', 
              background: mode === 'login' ? 'var(--bg-primary)' : 'transparent', 
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: mode === 'login' ? 600 : 500,
              boxShadow: mode === 'login' ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.25s ease', cursor: 'pointer'
            }}
          >
            Iniciar sesión
          </button>
          <button 
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            style={{ 
              flex: 1, padding: '0.65rem', borderRadius: '16px', border: 'none', 
              background: mode === 'register' ? 'var(--bg-primary)' : 'transparent', 
              color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: mode === 'register' ? 600 : 500,
              boxShadow: mode === 'register' ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.25s ease', cursor: 'pointer'
            }}
          >
            Crear cuenta
          </button>
        </div>

        {googleEnabled && (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', minHeight: '44px', overflow: 'visible' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
                theme="filled_black"
                size="large"
                shape="pill"
                text="continue_with"
                width={googleWidth}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '1.5rem', opacity: 0.5 }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--text-primary)' }}></div>
              <span style={{ padding: '0 10px', fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--text-primary)' }}>O CON EMAIL</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--text-primary)' }}></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <input
              type="text"
              name="name"
              placeholder="Tu nombre"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              className="form-input"
              style={{ width: '100%' }}
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={handleChange}
            required
            className="form-input"
            style={{ width: '100%' }}
          />

          <input
            type="password"
            name="password"
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Contraseña'}
            value={form.password}
            onChange={handleChange}
            required
            minLength={mode === 'register' ? 6 : 1}
            className="form-input"
            style={{ width: '100%' }}
          />

          {error && (
            <div style={{ color: '#EF4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              s? {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

      </div>
    </div>
  );
}
