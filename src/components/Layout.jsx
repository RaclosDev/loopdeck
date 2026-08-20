import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import Mascot from './Mascot';

function Layout({ children }) {
  const { toasts, deferredPrompt, setDeferredPrompt } = useStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Bottom nav items for mobile
  const bottomNavItems = [
    { to: '/', icon: '📚', label: 'Mazos', end: true },
    { to: '/add', icon: '➕', label: 'Añadir', end: false },
    { to: '/stats', icon: '📊', label: 'Stats', end: false },
    { to: '/settings', icon: '⚙️', label: 'Config', end: false },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/loopdeck-icon-192.png" alt="Logo" style={{ width: '26px', height: '26px', borderRadius: '7px' }} />
          <span className="mobile-header-title">LoopDeck</span>
        </div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span style={{ color: '#ff7b00' }}>🔥 {user.streak || 0}</span>
            <span style={{ color: '#ffd700' }}>🪙 {user.points || 0}</span>
          </div>
        ) : (
          <div style={{ width: 28 }} />
        )}
      </div>

      <div className="app-layout">
        {/* Sidebar (desktop only — hidden on mobile via CSS) */}
        {!isStudyPage && (
          <aside className="sidebar">
            <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: user ? '20px' : '0' }}>
                <div className="sidebar-logo-icon" style={{ background: 'transparent' }}>
                  <img src="/loopdeck-icon-192.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                </div>
                <span className="sidebar-logo">LoopDeck</span>
              </div>
              
              {user && (
                <>
                  <Mascot skin={user.mascot || 'default'} size={80} streak={user.streak || 0} />
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    <span style={{ color: '#ff7b00', display: 'flex', alignItems: 'center', gap: '4px' }}>🔥 {user.streak || 0}</span>
                    <span style={{ color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px' }}>🪙 {user.points || 0}</span>
                  </div>
                </>
              )}
            </div>

            <nav className="sidebar-nav">
              <div className="sidebar-section-title">Principal</div>

              <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">📚</span>
                Mis Mazos
              </NavLink>

              <NavLink to="/add" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">➕</span>
                Añadir Tarjeta
              </NavLink>

              <NavLink to="/stats" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">📊</span>
                Estadísticas
              </NavLink>

              <div className="sidebar-section-title" style={{ marginTop: 16 }}>
                Herramientas
              </div>

              <NavLink to="/templates" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">📥</span>
                Plantillas
              </NavLink>

              <NavLink to="/shop" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">🛍️</span>
                Tienda
              </NavLink>

              <NavLink to="/browser" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
                <span className="link-icon">🔍</span>
                Explorar Tarjetas
              </NavLink>

              <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => {}}>
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
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
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
        <main
          className={`main-content ${isStudyPage ? 'study-mode' : ''}`}
          style={isStudyPage ? { marginLeft: 0, width: '100%', maxWidth: '100%' } : {}}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {!isStudyPage && (
        <nav className="bottom-nav" aria-label="Navegación principal">
          {bottomNavItems.map(item => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.to)}
                aria-label={item.label}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

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
