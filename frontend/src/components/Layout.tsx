import toast from 'react-hot-toast';
import StudyPreparation from './StudyPreparation';
import useStore from '../store/useStore';
import { useState, useEffect, useRef, Suspense, type CSSProperties } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { DEMO, EMBED } from '../demo/mode';
import {
  Folder,
  PlusCircle,
  BarChart2,
  LayoutTemplate,
  Search,
  Settings,
  Download,
  LogOut,
  Share,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: <Folder className="w-5 h-5" />, label: 'Mis Mazos', shortLabel: 'Mazos' },
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

const bottomNavPaths = ['/', '/add', '/stats', '/browser'];
// Al pie del menú lateral, junto a cerrar sesión: lo que se toca de tarde en tarde.
const footNavPaths = ['/templates', '/settings'];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const { logout, user } = useAuth();
  const userInitial = (user?.name?.trim()[0] ?? 'U').toUpperCase();
  const deferredPrompt = useStore((s) => s.deferredPrompt);
  const setDeferredPrompt = useStore((s) => s.setDeferredPrompt);

  const isStudyPage =
    location.pathname.startsWith('/study') || /^\/hub\/[^/]+\/[^/]+/.test(location.pathname);

  const isSheetOverview =
    location.pathname === '/' || /^\/hub(?:\/[^/]+)?\/?$/.test(location.pathname);

  // Las páginas de lista (estadísticas, plantillas, explorar…) usan el mismo lienzo que Mis mazos:
  // título suelto y paneles sueltos, en vez de una hoja grande con tarjetas dentro.
  const isOpenPage = !isStudyPage && !isSheetOverview;

  useEffect(() => {
    setSidebarOpen(false);
    setAccountMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Interceptar PWA
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
        return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('data-reload')) return;
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//') && anchor.target !== '_blank') {
        e.preventDefault();
        e.stopPropagation();
        navigate(href);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [navigate]);

  // El menú de cuenta se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [accountMenuOpen]);

  const closeSidebar = () => setSidebarOpen(false);
  const renderNavItem = (item: (typeof navItems)[number]) => {
    const isActive =
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
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
        <span className="nav-label">{item.label}</span>
      </button>
    );
  };
  const bottomItems = navItems.filter((i) => bottomNavPaths.includes(i.path));
  const isNavItemActive = (path: string) =>
    path === '/'
      ? location.pathname === '/' || /^\/(hub|study)(\/|$)/.test(location.pathname)
      : location.pathname.startsWith(path);
  // Índice de la pestaña resaltada. -1 oculta la píldora.
  const activeBottomIndex = bottomItems.findIndex((i) => isNavItemActive(i.path));
  const pageTitle = location.pathname.startsWith('/add')
    ? 'Añadir tarjeta'
    : navItems.find((item) => item.path === location.pathname)?.label;

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
      toast(
        'Para instalar LoopDeck en el iPhone, abre Compartir en Safari y elige «Añadir a pantalla de inicio». En Safari 26 o posterior puede estar dentro de «Ver más».',
        { icon: <Share className="w-5 h-5" aria-hidden="true" />, duration: 8000 },
      );
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
      {(location.pathname === '/' ||
        location.pathname === '/hub' ||
        /^\/hub\/[^/]+$/.test(location.pathname)) && <StudyPreparation />}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`}
        role="presentation"
        onClick={closeSidebar}
      />

      <div className="app-container has-rail">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <p className="sidebar-mono brand text-3xl" aria-hidden="true">
              <span className="text-[var(--accent-primary)]">L</span>
              <span className="text-foreground">D</span>
            </p>
            <div className="sidebar-brand-container flex items-center">
              <div className="brand text-3xl m-0">
                <span className="text-[var(--accent-primary)]">Loop</span>
                <span className="text-foreground">Deck</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <nav className="sidebar-nav" aria-label="Secciones">
            {navItems.filter((i) => !footNavPaths.includes(i.path)).map(renderNavItem)}
          </nav>
          <div className="sidebar-foot">
            {navItems.filter((i) => footNavPaths.includes(i.path)).map(renderNavItem)}
            <button type="button" className="nav-item text-destructive" onClick={logout}>
              <span className="nav-icon">
                <LogOut className="w-5 h-5" />
              </span>
              <span className="nav-label">Cerrar sesión</span>
            </button>
          </div>
        </aside>

        <main className={`main-content ${isStudyPage ? 'study-mode' : ''}`}>
          {DEMO && !EMBED && !isStudyPage && (
            <p className="demo-banner" role="status">
              <span>
                <strong>Modo demo.</strong>{' '}
                <span className="demo-banner__long">
                  Datos ficticios: los cambios se pierden al recargar.
                </span>
              </span>{' '}
              <a href="/" data-reload>
                Salir<span className="demo-banner__long"> y crear una cuenta</span>
              </a>
            </p>
          )}
          {!isStudyPage && (
            <header className="mobile-top-bar">
              <div className="brand mobile-top-logo">
                <span>Loop</span>
                <span>Deck</span>
              </div>
              <ThemeToggle />
              <div className="mobile-account" ref={accountMenuRef}>
                <button
                  type="button"
                  className="mobile-avatar-btn"
                  aria-label="Cuenta y ajustes"
                  title="Cuenta y ajustes"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  {user?.picture ? (
                    <img src={user.picture} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span aria-hidden="true">{userInitial}</span>
                  )}
                </button>
                {accountMenuOpen && (
                  <div className="account-menu" role="menu" aria-label="Cuenta">
                    <button
                      type="button"
                      role="menuitem"
                      className="account-menu-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        if (location.pathname !== '/templates') navigate('/templates');
                      }}
                    >
                      <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
                      Plantillas
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="account-menu-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        if (location.pathname !== '/settings') navigate('/settings');
                      }}
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      Configuración
                    </button>
                    {(deferredPrompt || showIosInstall) && (
                      <button
                        type="button"
                        role="menuitem"
                        className="account-menu-item"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          void handleInstallClick();
                        }}
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Instalar app
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="account-menu-item is-danger"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </header>
          )}
          <div
            className={`main-content-inner ${
              isSheetOverview
                ? 'sheet-canvas'
                : isOpenPage && pageTitle
                  ? 'sheet-canvas page-canvas'
                  : 'paper-panel'
            }`}
          >
            {pageTitle && isOpenPage && (
              <header className="canvas-heading">
                <h1>{pageTitle}</h1>
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
        <nav
          className="mobile-bottom-nav"
          aria-label="Navegación inferior"
          style={
            {
              '--nav-count': bottomItems.length,
              '--nav-active': Math.max(activeBottomIndex, 0),
            } as CSSProperties
          }
        >
          {/* Un único resaltado que se desliza entre pestañas */}
          <span
            className={`mobile-bottom-pill${activeBottomIndex < 0 ? ' is-hidden' : ''}`}
            aria-hidden="true"
          />
          {bottomItems.map((item) => {
            const isActive = isNavItemActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                className={`mobile-bottom-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (location.pathname !== item.path) navigate(item.path);
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.shortLabel}
              >
                <span className="mobile-bottom-icon" aria-hidden="true">
                  {item.icon}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
