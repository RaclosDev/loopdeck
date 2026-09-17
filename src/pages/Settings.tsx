import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { applyThemeColor } from '../utils/colorHelper';

const PRESETS = ['#0085FF', '#E11D48', '#FFFFFF', '#FF5E00', '#8B5CF6', '#10B981'];

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, addToast } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');
  const [customColor, setCustomColor] = useState(localStorage.getItem('loopdeck_custom_color') || '#0085FF');

  const handleColorChange = (color: string) => {
    setCustomColor(color);
    applyThemeColor(color);
  };

  const handleClearLocalData = () => {
    if (window.confirm('¿Seguro que quieres limpiar los datos guardados localmente? Tendrás que volver a iniciar sesión.')) {
      localStorage.clear();
      useAuthStore.getState().logout();
      window.location.href = '/auth';
    }
  };

  const handleClearCache = () => {
    addToast('Caché limpiada', 'success');
  };

  const tabs = [
    { id: 'study', label: 'Estudio' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'account', label: 'Cuenta' }
  ];

  return (
    <div className="fade-in pb-10">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '1rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'study' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.5rem 0' }}>Opciones de Estudio</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Cronómetro de Sesión</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mostrar el tiempo durante el estudio</div>
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
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 className="card-title" style={{ margin: '0 0 1.5rem 0' }}>Apariencia</h3>

          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Color Principal</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <input 
                type="color" 
                value={customColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '40px',
                  height: '40px',
                  padding: '0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: color, border: customColor === color ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer', padding: 0, transition: 'transform 0.1s'
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              El color se aplicará instantáneamente a toda la interfaz.
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Animaciones 3D</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Efecto de giro al voltear tarjetas</div>
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
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Tu Cuenta</h3>
          
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="icon-btn" onClick={handleClearLocalData}>
              Limpiar Caché Local
            </button>
            <button 
              className="btn btn-danger" 
              style={{ width: '100%', padding: '0.875rem', borderRadius: '12px' }}
              onClick={() => {
                if(window.confirm('¿Quieres cerrar sesión?')) {
                  logout();
                  navigate('/auth');
                }
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




