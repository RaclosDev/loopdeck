import { NavLink, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';

function Layout({ children }) {
  const { sidebarOpen, toggleSidebar, closeSidebar, toasts, deferredPrompt, setDeferredPrompt } = useStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const isStudyPage = location.pathname.startsWith('/study');

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  };

  const showIosInstall = isIos() && !isStandalone();

  const handleInstallClick = async () => {
    if (showIosInstall) {
      alert('🍏 Para instalar LoopDeck en iOS:\n\n1. Toca el botón de Compartir en Safari (el cuadrado con la flecha hacia arriba).\n2. Selecciona "Añadir a la pantalla de inicio".\n\nAsí tendrás el icono y la app a pantalla completa.');
      return;
    }
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Menu">
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/loopdeck-icon-192.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <span className="mobile-header-title">LoopDeck</span>
        </div>
        <div style={{ width: 28 }} />
      </div>

      <div className="app-layout">
        {/* Sidebar Overlay (mobile) */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        {!isStudyPage && (
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div className="sidebar-logo-icon" style={{ background: 'transparent' }}>
                <img src="/loopdeck-icon-192.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              </div>
              <span className="sidebar-logo">LoopDeck</span>
            </div>

            <nav className="sidebar-nav">
              <div className="sidebar-section-title">Principal</div>

              <NavLink
                to="/"
                end
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">📚</span>
                Mis Mazos
              </NavLink>

              <NavLink
                to="/add"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">➕</span>
                Añadir Tarjeta
              </NavLink>

              <NavLink
                to="/stats"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">📊</span>
                Estadísticas
              </NavLink>

              <div className="sidebar-section-title" style={{ marginTop: 16 }}>
                Herramientas
              </div>

              <NavLink
                to="/browser"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">🔍</span>
                Explorar Tarjetas
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="link-icon">⚙️</span>
                Configuración
              </NavLink>

              {(deferredPrompt || showIosInstall) && (
                <button
                  className="sidebar-link"
                  onClick={handleInstallClick}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <span className="link-icon">📱</span>
                  Instalar App
                </button>
              )}
            </nav>

            <div className="sidebar-footer">
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-color), var(--purple-accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                </div>
              )}
              <button
                id="logout-btn"
                className="sidebar-link"
                onClick={logout}
                style={{ color: 'var(--danger-color)', width: '100%' }}
              >
                <span className="link-icon">🚪</span>
                Cerrar sesión
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 8 }}>
                LoopDeck v0.1.0
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`main-content ${isStudyPage ? 'study-mode' : ''}`}
          style={isStudyPage ? { marginLeft: 0, width: '100%', maxWidth: '100%' } : {}}
        >
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default Layout;
