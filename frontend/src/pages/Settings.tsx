import useStore from '../store/useStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applyThemeColor } from '../utils/colorHelper';

const PRESETS = ['#0085FF', '#E11D48', '#FFFFFF', '#FF5E00', '#8B5CF6', '#10B981'];

export default function Settings() {
  const { user, logout } = useAuth();
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
    logout();
    window.location.href = '/';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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
        <div className="card" style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
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
        <div className="card" style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
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
        <div className="card" style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
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
