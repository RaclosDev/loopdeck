import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuthStore();
  const googleBtnRef = useRef(null);
  const [googleClientId, setGoogleClientId] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId && data.googleClientId !== 'TU_CLIENT_ID_AQUI') {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(err => console.error('Error fetching auth config', err));
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: googleBtnRef.current.offsetWidth,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
          });
        }
      }
    };
    if (window.google?.accounts?.id) initGoogle();
    else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleClientId, mode]);

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
      if (mode === 'login') await login(form.email, form.password);
      else {
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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(rgba(8, 8, 12, 0.82), rgba(5, 5, 8, 0.90)), url(/login-bg.jpg) center/cover no-repeat fixed',
      color: 'var(--text-primary, #fff)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        background: 'rgba(28, 28, 30, 0.65)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '2.5rem 2rem',
        borderRadius: '28px',
        border: '1px solid rgba(0, 133, 255, 0.3)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 133, 255, 0.15)',
        maxWidth: '400px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        {/* Logo Icon */}
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '22px',
          overflow: 'hidden',
          marginBottom: '1rem',
          border: '1.5px solid rgba(0, 133, 255, 0.65)',
          boxShadow: '0 0 25px rgba(0, 133, 255, 0.45), 0 8px 24px rgba(0, 0, 0, 0.7)',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/loopdeck-icon-192.png" 
            alt="LoopDeck Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
        
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>LoopDeck</h1>

        <p style={{ 
          color: 'var(--text-secondary, #94a3b8)', 
          fontSize: '0.95rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Spaced repetition, reimagined.
        </p>

        {/* Tab Buttons */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(0,0,0,0.5)', 
          padding: '4px', 
          borderRadius: '16px', 
          marginBottom: '1.5rem',
          width: '100%',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button 
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{ 
              flex: 1, padding: '0.65rem', borderRadius: '12px', border: 'none', 
              background: mode === 'login' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
              fontWeight: mode === 'login' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            Iniciar sesión
          </button>
          <button 
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            style={{ 
              flex: 1, padding: '0.65rem', borderRadius: '12px', border: 'none', 
              background: mode === 'register' ? 'rgba(255,255,255,0.15)' : 'transparent', 
              color: mode === 'register' ? '#fff' : 'var(--text-secondary)',
              fontWeight: mode === 'register' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            Crear cuenta
          </button>
        </div>

        <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '1.5rem', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
          <span style={{ padding: '0 10px', fontSize: '0.75rem', letterSpacing: '1px' }}>O CON EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
        </div>

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
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)' }}
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
            style={{ width: '100%', background: 'rgba(0,0,0,0.5)' }}
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
            style={{ width: '100%', background: 'rgba(0,0,0,0.5)' }}
          />

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', borderRadius: '16px', fontWeight: 700 }}
          >
            {loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

      </div>
    </div>
  );
}
