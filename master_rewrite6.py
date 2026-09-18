import os

with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write('''import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { applyThemeColor } from '../utils/colorHelper';

const PRESETS = ['#0085FF', '#E11D48', '#FFFFFF', '#FF5E00', '#8B5CF6', '#10B981'];

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');
  const [customColor, setCustomColor] = useState(localStorage.getItem('loopdeck_custom_color') || '#0085FF');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleColorChange = (color: string) => {
    setCustomColor(color);
    applyThemeColor(color);
  };

  const handleClearLocalData = () => {
    localStorage.clear();
    useAuthStore.getState().logout();
    window.location.href = '/auth';
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const tabs = [
    { id: 'study', label: 'Estudio' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'account', label: 'Cuenta' }
  ];

  return (
    <div className="fade-in pb-12">
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem', borderRadius: '20px', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 500,
              boxShadow: activeTab === tab.id ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.25s ease',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'study' && (
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Opciones de Estudio</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cronómetro de Sesión</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Mostrar el tiempo durante el estudio</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.showTimer} 
                onChange={(e) => updateSettings({ showTimer: e.target.checked })} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Apariencia</h3>

          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Color Principal</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <input 
                type="color" 
                value={customColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '44px',
                  height: '44px',
                  padding: '0',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: color, border: customColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer', padding: 0, transition: 'transform 0.1s'
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              El color se aplicará instantáneamente a toda la interfaz.
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Animaciones 3D</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Efecto de giro al voltear tarjetas</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.animationsEnabled ?? true} 
                onChange={(e) => updateSettings({ animationsEnabled: e.target.checked })} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Tu Cuenta</h3>
          
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{user.email}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowClearModal(true)} style={{ width: '100%' }}>
              Limpiar Caché Local
            </button>
            <button className="btn btn-danger" onClick={() => setShowLogoutModal(true)} style={{ width: '100%' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Clear Cache Modal */}
      {showClearModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.25rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Limpiar Caché</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>¿Seguro que quieres limpiar los datos locales? Tendrás que volver a iniciar sesión.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowClearModal(false)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }} onClick={handleClearLocalData}>Limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.25rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Cerrar Sesión</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>¿Estás seguro de que quieres cerrar tu sesión actual?</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoutModal(false)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }} onClick={handleLogout}>Cerrar Sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
''')

with open('src/pages/AuthPage.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, googleLogin } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId) {
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

  const handleGoogleResponse = async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else {
        if (form.name.trim().length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
        await register(form.email, form.name, form.password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en auth');
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
      <div style={{
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
        
        {/* Logo Icon */}
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
        
        <div className="brand-logo-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <span className="brand-logo-loop">Loop</span>
          <span className="brand-logo-deck">Deck</span>
        </div>

        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.95rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Spaced repetition, reimagined.
        </p>

        {/* Tab Buttons (SegmentedControl style) */}
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

        <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '1.5rem', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--text-primary)' }}></div>
          <span style={{ padding: '0 10px', fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--text-primary)' }}>O CON EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--text-primary)' }}></div>
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
              ❌ {error}
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
''')

print("Settings & AuthPage rewritten")
