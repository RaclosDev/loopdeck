import os
import re

with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { applyThemeColor } from '../utils/colorHelper';", 
"import { applyThemeColor } from '../utils/colorHelper';\nimport Modal from '../components/ui/Modal';")

content = content.replace("  const [customColor, setCustomColor] = useState(localStorage.getItem('loopdeck_custom_color') || '#0085FF');",
"  const [customColor, setCustomColor] = useState(localStorage.getItem('loopdeck_custom_color') || '#0085FF');\n  const [showClearModal, setShowClearModal] = useState(false);\n  const [showLogoutModal, setShowLogoutModal] = useState(false);")

old_handle_clear = """  const handleClearLocalData = () => {
    if (window.confirm('Seguro que quieres limpiar los datos guardados localmente? Tendrǭs que volver a iniciar sesin.')) {
      localStorage.clear();
      useAuthStore.getState().logout();
      window.location.href = '/auth';
    }
  };"""

new_handle_clear = """  const handleClearLocalData = () => {
    localStorage.clear();
    useAuthStore.getState().logout();
    window.location.href = '/auth';
  };"""
content = content.replace(old_handle_clear, new_handle_clear)

old_buttons = """          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="icon-btn" onClick={handleClearLocalData}>
              Limpiar CachǸ Local
            </button>
            <button 
              className="btn btn-danger" 
              style={{ width: '100%', padding: '0.875rem', borderRadius: '12px' }}
              onClick={() => {
                if(window.confirm('Quieres cerrar sesin?')) {
                  logout();
                  navigate('/auth');
                }
              }}
            >
              Cerrar sesin
            </button>
          </div>"""

new_buttons = """          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowClearModal(true)} style={{ width: '100%' }}>
              Limpiar Caché Local
            </button>
            <button className="btn btn-danger" onClick={() => setShowLogoutModal(true)} style={{ width: '100%', padding: '0.875rem', borderRadius: '12px' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

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

      {showLogoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.25rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Cerrar Sesión</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>¿Estás seguro de que quieres cerrar tu sesión actual?</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoutModal(false)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }} onClick={() => { logout(); navigate('/auth'); }}>Cerrar Sesión</button>
            </div>
          </div>
        </div>
      )}"""

# We need to just regex replace from the buttons to the end of the div
content = re.sub(r'<div style=\{\{ display: \'flex\', flexDirection: \'column\', gap: \'0\.75rem\' \}\}.*?Cerrar sesin\s*</button>\s*</div>', new_buttons, content, flags=re.DOTALL)

with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
