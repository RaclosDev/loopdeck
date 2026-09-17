import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, addToast } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');

  const handleClearLocalData = () => {
    if (window.confirm('¿Seguro que quieres limpiar los datos guardados localmente? Tendrás que volver a iniciar sesión.')) {
      localStorage.clear();
      sessionStorage.clear();
      logout();
      navigate('/auth');
      addToast('Caché limpiada', 'success');
    }
  };

  const tabs = [
    { id: 'study', label: 'Estudio' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'account', label: 'Cuenta' }
  ];

  return (
    <div className="fade-in pb-10">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Configuración</h1>
        <p>Personaliza tu experiencia de estudio</p>
      </div>

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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Opciones de Estudio</h3>
          
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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Apariencia</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
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
            <button className="glass-btn" onClick={handleClearLocalData}>
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
