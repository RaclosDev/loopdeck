import { useState } from 'react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const { settings, updateSettings, addToast } = useStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');

  const handleClearLocalData = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar la caché local de configuración? Tus mazos seguirán a salvo en la nube.')) {
      localStorage.removeItem('loopdeck-settings');
      addToast('Caché local borrada. Recarga la página.', 'info');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <h1>Configuración</h1>
        <p>Personaliza tu experiencia de estudio y gestiona tu cuenta</p>
      </div>

      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', '-webkit-overflow-scrolling': 'touch' }}>
        <button 
          className={`settings-tab-btn ${activeTab === 'study' ? 'active' : ''}`}
          onClick={() => setActiveTab('study')}
          style={{ 
            padding: '0.875rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'study' ? '2px solid var(--accent-color)' : '2px solid transparent', 
            color: activeTab === 'study' ? 'var(--accent-light)' : 'var(--text-muted)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            minWidth: '80px',
          }}
        >
          📚 Estudio
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
          style={{ 
            padding: '0.875rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'appearance' ? '2px solid var(--accent-color)' : '2px solid transparent', 
            color: activeTab === 'appearance' ? 'var(--accent-light)' : 'var(--text-muted)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            minWidth: '80px',
          }}
        >
          ✨ Apariencia
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
          style={{ 
            padding: '0.875rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'account' ? '2px solid var(--accent-color)' : '2px solid transparent', 
            color: activeTab === 'account' ? 'var(--accent-light)' : 'var(--text-muted)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            minWidth: '80px',
          }}
        >
          👤 Cuenta
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'study' && (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Opciones de Estudio</h3>
            
            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Cronómetro de Sesión</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Mostrar el tiempo que llevas estudiando en la esquina superior.</div>
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

              <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontWeight: 600 }}>Orden de Repaso</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Decide qué tipo de tarjetas ver primero.</div>
                </div>
                <select 
                  className="glass-select" 
                  value={settings.studyOrder} 
                  onChange={(e) => updateSettings({ studyOrder: e.target.value })}
                  style={{ width: '100%', maxWidth: '200px' }}
                >
                  <option value="new_first">Nuevas primero</option>
                  <option value="review_first">Repasos primero</option>
                  <option value="mixed">Mezclado aleatorio</option>
                </select>
              </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Apariencia y Accesibilidad</h3>
            
            <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Animaciones 3D</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Activa o desactiva la animación de giro al voltear tarjetas. (Recomendado desactivar en dispositivos lentos).</div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.animationsEnabled} 
                  onChange={(e) => updateSettings({ animationsEnabled: e.target.checked })} 
                />
                <span className="slider"></span>
              </label>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '1rem', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-md)' }}>
              ℹ️ LoopDeck actualmente utiliza un diseño Dark Glassmorphism de alto contraste por defecto para reducir la fatiga visual. Pronto añadiremos más temas.
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Tu Cuenta</h3>
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), var(--purple-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.name}</div>
                  <div style={{ color: 'var(--text-dim)' }}>{user.email}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)' }}>No has iniciado sesión.</div>
            )}

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }}></div>

            <h4 style={{ margin: 0, color: 'var(--danger-color)' }}>Zona de Peligro</h4>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="glass-btn" onClick={handleClearLocalData}>
                Limpiar Caché Local
              </button>
              
              <button 
                className="danger-btn" 
                onClick={() => {
                  if(window.confirm('¿Quieres cerrar sesión?')) {
                    logout();
                    navigate('/auth');
                  }
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: .3s;
          border-radius: 24px;
          border: 1px solid var(--border-color);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 2px;
          bottom: 2px;
          background-color: var(--text-muted);
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--accent-color);
          border-color: var(--accent-color);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
          background-color: white;
        }
      `}</style>
    </div>
  );
}

export default Settings;
