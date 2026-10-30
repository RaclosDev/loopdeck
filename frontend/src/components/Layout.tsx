import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { useState, useEffect, Suspense } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomSheet from './BottomSheet';
import {
  Folder,
  GraduationCap,
  PlusCircle,
  BarChart2,
  LayoutTemplate,
  Search,
  Settings,
  Download,
  LogOut,
  Menu,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: <Folder className="w-5 h-5" />, label: 'Mis Mazos', shortLabel: 'Mazos' },
  {
    path: '/hub',
    icon: <GraduationCap className="w-5 h-5" />,
    label: 'Centro de Estudio',
    shortLabel: 'Estudiar',
  },
  {
    path: '/add',
    icon: <PlusCircle className="w-5 h-5" />,
    label: 'Añadir Tarjeta',
    shortLabel: 'Añadir',
  },
  {
    path: '/stats',
    icon: <BarChart2 className="w-5 h-5" />,
    label: 'Estadísticas',
    shortLabel: 'Stats',
  },
  {
    path: '/templates',
    icon: <LayoutTemplate className="w-5 h-5" />,
    label: 'Plantillas',
    shortLabel: 'Plantillas',
  },
  {
    path: '/browser',
    icon: <Search className="w-5 h-5" />,
    label: 'Explorar Tarjetas',
    shortLabel: 'Explorar',
  },
  {
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
    label: 'Configuración',
    shortLabel: 'Ajustes',
  },
];

const bottomNavPaths = ['/', '/hub', '/add', '/stats'];
const moreMenuPaths = ['/templates', '/browser', '/settings'];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const { logout } = useAuth();
  const deferredPrompt = useStore((s) => s.deferredPrompt);
  const setDeferredPrompt = useStore((s) => s.setDeferredPrompt);

  const isStudyPage =
    location.pathname.startsWith('/study') ||
    location.pathname.includes('/quiz') ||
    location.pathname.includes('/chunked') ||
    location.pathname.includes('/tutor');

  useEffect(() => {
    setSidebarOpen(false);
    setMoreMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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
  const isMoreActive = moreMenuPaths.some((p) => location.pathname.startsWith(p));
  const pageTitle = navItems.find((item) => item.path === location.pathname)?.label;

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone === true)
    );
  };

  const showIosInstall = isIos() && !isStandalone();

  const handleInstallClick = async () => {
    if (showIosInstall) {
      toast('Para instalar LoopDeck en iOS: toca Compartir y "Añadir a la pantalla de inicio".', {
        icon: '📲',
        duration: 6000,
      });
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
        <header className="mobile-top-bar justify-center">
          <div className="mobile-top-logo flex items-center justify-center">
            <div className="brand text-2xl m-0">
              <span className="text-[var(--accent-primary)]">Loop</span>
              <span className="text-foreground">Deck</span>
            </div>
          </div>
        </header>
      )}

      <div className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />

      <div className="app-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand-container flex items-center">
              <div className="brand text-3xl m-0">
                <span className="text-[var(--accent-primary)]">Loop</span>
                <span className="text-foreground">Deck</span>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
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
              <button type="button" className="nav-item" onClick={handleInstallClick}>
                <span className="nav-icon">
                  <Download className="w-5 h-5" />
                </span>
                Instalar App
              </button>
            )}

            <button
              type="button"
              className="nav-item text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <span className="nav-icon">
                <LogOut className="w-5 h-5" />
              </span>
              Cerrar sesión
            </button>
          </nav>
          <p className="sidebar-note">
            Tu colección.
            <br />
            Un repaso cada día.
          </p>
        </aside>

        <main className={`main-content ${isStudyPage ? 'study-mode' : ''}`}>
          <div className="main-content-inner paper-panel landing-tape">
            {pageTitle && location.pathname !== '/' && (
              <header className="page-heading">
                <h1>{pageTitle}</h1>
                <p>
                  {location.pathname === '/'
                    ? 'Lo que aprendes se queda contigo.'
                    : 'Tu cuaderno de estudio.'}
                </p>
              </header>
            )}
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div className="spinner" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {!isStudyPage && (
        <nav className="mobile-bottom-nav" aria-label="Navegación inferior">
          {navItems
            .filter((i) => bottomNavPaths.includes(i.path))
            .map((item) => {
              const isActive =
                item.path === '/'
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
                  aria-current={isActive ? 'page' : undefined}
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
            aria-expanded={moreMenuOpen}
          >
            <span className="mobile-bottom-icon">
              <Menu className="w-5 h-5" />
            </span>
            <span className="mobile-bottom-label">Más</span>
            {isMoreActive && <span className="mobile-bottom-indicator" />}
          </button>
        </nav>
      )}

      {moreMenuOpen && !isStudyPage && (
        <BottomSheet isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} title="Menú">
          <div className="bottom-sheet-grid">
            {navItems
              .filter((i) => moreMenuPaths.includes(i.path))
              .map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={`bottom-sheet-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate(item.path);
                  }}
                >
                  <span className="bottom-sheet-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

            {(deferredPrompt || showIosInstall) && (
              <button
                type="button"
                className="bottom-sheet-item"
                onClick={() => {
                  setMoreMenuOpen(false);
                  handleInstallClick();
                }}
              >
                <span className="bottom-sheet-item-icon">
                  <Download className="w-5 h-5" />
                </span>
                <span>Instalar App</span>
              </button>
            )}

            <button
              type="button"
              className="bottom-sheet-item text-destructive"
              onClick={() => {
                setMoreMenuOpen(false);
                logout();
              }}
            >
              <span className="bottom-sheet-item-icon">
                <LogOut className="w-5 h-5" />
              </span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
