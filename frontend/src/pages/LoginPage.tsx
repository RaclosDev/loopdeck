import { useState, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  const containerRef = useRef<HTMLDivElement>(null);

  const customGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        const res = await api.post('/auth/google', { 
          credential: tokenResponse.access_token,
          token: tokenResponse.access_token
        });
        login(res.data.token, res.data.refreshToken);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error con Google');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => customGoogleLogin()}
              style={{
                width: '100%',
                padding: '0.875rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.72 17.58V20.34H19.29C21.37 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.72 17.58C14.73 18.24 13.47 18.64 12 18.64C9.15 18.64 6.74 16.71 5.88 14.12H2.21V16.97C4.01 20.55 7.71 23 12 23Z" fill="#34A853"/>
                <path d="M5.88 14.12C5.66 13.46 5.54 12.75 5.54 12C5.54 11.25 5.66 10.54 5.88 9.88V7.03H2.21C1.47 8.5 1.05 10.2 1.05 12C1.05 13.8 1.47 15.5 2.21 16.97L5.88 14.12Z" fill="#FBBC05"/>
                <path d="M12 5.36C13.62 5.36 15.07 5.92 16.21 7.02L19.37 3.86C17.45 2.07 14.96 1 12 1C7.71 1 4.01 3.45 2.21 7.03L5.88 9.88C6.74 7.29 9.15 5.36 12 5.36Z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

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
