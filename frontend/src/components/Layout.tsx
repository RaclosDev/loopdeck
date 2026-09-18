import useStore from '../store/useStore';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: '📚', label: 'Mis Mazos', shortLabel: 'Mazos' },
  { path: '/hub', icon: '✏️', label: 'Centro de Estudio', shortLabel: 'Estudiar' },
  { path: '/add', icon: '➕', label: 'Añadir Tarjeta', shortLabel: 'Añadir' },
  { path: '/stats', icon: '📊', label: 'Estadísticas', shortLabel: 'Stats' },
  { path: '/templates', icon: '📥', label: 'Plantillas', shortLabel: 'Plantillas' },
  { path: '/browser', icon: '🔍', label: 'Explorar Tarjetas', shortLabel: 'Explorar' },
  { path: '/settings', icon: '⚙️', label: 'Configuración', shortLabel: 'Ajustes' },
];

const bottomNavPaths = ['/', '/hub', '/add', '/stats'];
const moreMenuPaths = ['/templates', '/browser', '/settings'];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  const { user, logout } = useAuth();
  const deferredPrompt = useStore(s => s.deferredPrompt);
  const setDeferredPrompt = useStore(s => s.setDeferredPrompt);

  const isStudyPage = location.pathname.startsWith('/study') || 
                      location.pathname.includes('/quiz') || 
                      location.pathname.includes('/chunked') || 
                      location.pathname.includes('/tutor');

  useEffect(() => {
    setSidebarOpen(false);
    setMoreMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e: Event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [moreMenuOpen]);

  // Interceptar PWA
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//') && anchor.target !== '_blank') {
        e.preventDefault();
        e.stopPropagation();
        navigate(href);
      }
    };
    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [navigate]);

  const closeSidebar = () => setSidebarOpen(false);
  const isMoreActive = moreMenuPaths.some(p => location.pathname.startsWith(p));

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true);
  };

  const showIosInstall = isIos() && !isStandalone();

  const handleInstallClick = async () => {
    if (showIosInstall) {
      alert('🍏 Para instalar LoopDeck en iOS:\n\n1. Toca el botón de Compartir en Safari.\n2. Selecciona "Añadir a la pantalla de inicio".');
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
    <div className="app-root">
      {!isStudyPage && (
        <header className="mobile-top-bar">
          <div style={{ width: '48px' }}>
            {user && (
              <span style={{ color: '#ff7b00', fontSize: '0.85rem', fontWeight: 'bold' }}>🔥 {user.currentStreak || 0}</span>
            )}
          </div>
          <div className="mobile-top-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="brand-logo-text" style={{ fontSize: '1.5rem' }}>
              <span className="brand-logo-loop">Loop</span>
              <span className="brand-logo-deck">Deck</span>
            </div>
          </div>
          <div style={{ width: '48px' }} />
        </header>
      )}

      <div className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />

      <div className="app-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand-container" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="brand-logo-text" style={{ fontSize: '1.75rem' }}>
                <span className="brand-logo-loop">Loop</span>
                <span className="brand-logo-deck">Deck</span>
              </div>
            </div>
            {user && (
              <div style={{ color: '#ff7b00', fontWeight: 'bold', marginTop: 12 }}>🔥 {user.currentStreak || 0}</div>
            )}
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => {
              const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSidebar();
                    if (location.pathname !== item.path) navigate(item.path);
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
            
            {(deferredPrompt || showIosInstall) && (
              <button
                type="button"
                className="nav-item"
                onClick={handleInstallClick}
              >
                <span className="nav-icon">📱</span>
                Instalar App
              </button>
            )}
            
            <button
              type="button"
              className="nav-item"
              onClick={logout}
              style={{ color: 'var(--color-danger)' }}
            >
              <span className="nav-icon">🚪</span>
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <main className={`main-content ${isStudyPage ? 'study-mode' : ''}`}>
          <div className="main-content-inner">
            <Outlet />
          </div>
        </main>
      </div>

      {!isStudyPage && (
        <nav className="mobile-bottom-nav" aria-label="Navegación inferior">
          {navItems.filter(i => bottomNavPaths.includes(i.path)).map(item => {
            const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`mobile-bottom-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMoreMenuOpen(false);
                  if (location.pathname !== item.path) navigate(item.path);
                }}
                aria-label={item.label}
              >
                <span className="mobile-bottom-icon">{item.icon}</span>
                <span className="mobile-bottom-label">{item.shortLabel}</span>
                {isActive && <span className="mobile-bottom-indicator" />}
              </button>
            );
          })}
          <button
            type="button"
            className={`mobile-bottom-item ${isMoreActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMoreMenuOpen(!moreMenuOpen);
            }}
            aria-label="Más opciones"
          >
            <span className="mobile-bottom-icon">☰</span>
            <span className="mobile-bottom-label">Más</span>
            {isMoreActive && <span className="mobile-bottom-indicator" />}
          </button>
        </nav>
      )}

      {moreMenuOpen && (
        <div 
          className="bottom-sheet-overlay"
          onClick={() => setMoreMenuOpen(false)}
        >
          <div 
            className="bottom-sheet-content"
            onClick={(e) => e.stopPropagation()}
            ref={moreMenuRef}
          >
            <div className="bottom-sheet-drag-handle" />
            <h3 className="bottom-sheet-title">Más opciones</h3>
            <div className="bottom-sheet-grid">
              {navItems.filter(i => moreMenuPaths.includes(i.path)).map(item => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`bottom-sheet-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMoreMenuOpen(false);
                      if (location.pathname !== item.path) navigate(item.path);
                    }}
                  >
                    <div className="bottom-sheet-item-icon">{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
