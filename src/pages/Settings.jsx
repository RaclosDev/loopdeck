import { useState } from 'react';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const { settings, updateSettings, addToast } = useStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('study');
  const [copied, setCopied] = useState(null);

  const jsonExample = `[
  {
    "noteType": "basic",
    "fieldsJson": "{\\"front\\":\\"¿Cuál es la capital de Francia?\\",\\"back\\":\\"París\\"}",
    "tags": "geografía,europa"
  },
  {
    "noteType": "basic",
    "fieldsJson": "{\\"front\\":\\"¿Qué es la mitosis?\\",\\"back\\":\\"División celular que produce dos células hijas idénticas\\"}",
    "tags": "biología"
  }
]`;

  const aiPrompt = `Genera un mazo de tarjetas de estudio sobre [TU TEMA AQUÍ] en formato JSON para importar en LoopDeck. Usa exactamente este formato:

[
  {
    "noteType": "basic",
    "fieldsJson": "{\\"front\\":\\"PREGUNTA\\",\\"back\\":\\"RESPUESTA\\"}",
    "tags": "etiqueta1,etiqueta2"
  }
]

Reglas:
- Cada tarjeta tiene un "front" (pregunta) y un "back" (respuesta)
- fieldsJson es un STRING con JSON escapado dentro (las comillas internas van con \\")
- noteType siempre es "basic"
- tags son opcionales, separadas por comas
- Genera al menos 20 tarjetas variadas y útiles
- Las respuestas deben ser concisas pero completas`;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      addToast('Copiado al portapapeles', 'success');
      setTimeout(() => setCopied(null), 2000);
    });
  };

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
        <button 
          className={`settings-tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
          style={{ 
            padding: '0.875rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'import' ? '2px solid var(--accent-color)' : '2px solid transparent', 
            color: activeTab === 'import' ? 'var(--accent-light)' : 'var(--text-muted)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            minWidth: '80px',
          }}
        >
          📥 Importar
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

        {activeTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>📥 Importar Tarjetas con JSON</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Puedes importar cientos de tarjetas de golpe usando un archivo <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>.json</code>. 
                Ve a <strong>Mis Mazos</strong>, pulsa el icono <strong>📥</strong> de un mazo y selecciona tu archivo.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Formato del JSON</h4>
                <button 
                  className="glass-btn" 
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => handleCopy(jsonExample, 'json')}
                >
                  {copied === 'json' ? '✅ Copiado' : '📋 Copiar ejemplo'}
                </button>
              </div>
              <pre style={{ 
                background: 'rgba(0,0,0,0.4)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                color: '#a5f3fc', 
                fontSize: '0.8rem', 
                overflowX: 'auto', 
                margin: 0,
                lineHeight: 1.5,
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>{jsonExample}</pre>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                <strong>Campos:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>
                  <li><code style={{ color: '#a5f3fc' }}>noteType</code> — Siempre <code>"basic"</code></li>
                  <li><code style={{ color: '#a5f3fc' }}>fieldsJson</code> — Un string con JSON escapado: <code>{'{"front":"...","back":"..."}'}</code></li>
                  <li><code style={{ color: '#a5f3fc' }}>tags</code> — Etiquetas separadas por comas (opcional)</li>
                </ul>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)' }}>🤖 Prompt para IA (ChatGPT, Claude, etc.)</h4>
                <button 
                  className="glass-btn" 
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => handleCopy(aiPrompt, 'prompt')}
                >
                  {copied === 'prompt' ? '✅ Copiado' : '📋 Copiar prompt'}
                </button>
              </div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                Copia este prompt, pégalo en tu IA favorita y sustituye <strong>[TU TEMA AQUÍ]</strong> por lo que quieras estudiar. 
                La IA te generará un JSON listo para importar.
              </p>
              <pre style={{ 
                background: 'rgba(0,0,0,0.4)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                color: '#fde68a', 
                fontSize: '0.78rem', 
                overflowX: 'auto', 
                margin: 0,
                lineHeight: 1.5,
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>{aiPrompt}</pre>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '1rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>
              💡 <strong>Truco:</strong> También puedes exportar un mazo existente (📤 en Mis Mazos) para ver el formato exacto y usarlo como plantilla.
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
