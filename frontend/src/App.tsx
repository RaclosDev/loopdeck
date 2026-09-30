import { useEffect, useState, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

const Layout = lazy(() => import('./components/Layout'));
const GlobalStudy = lazy(() => import('./pages/GlobalStudy'));
const Study = lazy(() => import('./pages/Study'));
const StudyHub = lazy(() => import('./pages/StudyHub'));
const StudyGuide = lazy(() => import('./pages/StudyGuide'));
const StudyExplore = lazy(() => import('./pages/StudyExplore'));
const StudyQuiz = lazy(() => import('./pages/StudyQuiz'));
const StudyTutor = lazy(() => import('./pages/StudyTutor'));
const StudyChunkedQuiz = lazy(() => import('./pages/StudyChunkedQuiz'));
const AddCard = lazy(() => import('./pages/AddCard'));
const Stats = lazy(() => import('./pages/Stats'));
const Browser = lazy(() => import('./pages/Browser'));
const Settings = lazy(() => import('./pages/Settings'));
const Templates = lazy(() => import('./pages/Templates'));
import api from './api/client';
import useStore, { BeforeInstallPromptEvent } from './store/useStore';

let currentAppVersion: string | null = null;

class GlobalErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: unknown) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (error.name === 'ChunkLoadError' || error.message?.includes('fetch')) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', color: '#f1f5f9', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Nueva versión disponible</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Estamos actualizando la app. Por favor, recarga.</p>
          <button style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none' }} onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent({ googleClientId, configLoaded }: { googleClientId: string | null, configLoaded: boolean }) {
  const { token, isLoading, updateUser } = useAuth();
  const setDeferredPrompt = useStore(s => s.setDeferredPrompt);

  useEffect(() => {
    if (token && !isLoading) {
      api.get('/version').then((res: any) => {
        currentAppVersion = res.data.version;
      }).catch(err => console.error("Error fetching app version", err));
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          api.get('/version').then((res: any) => {
            if (currentAppVersion && res.data.version !== currentAppVersion) {
              window.location.reload();
            }
          }).catch(err => console.error("Error fetching app version", err));
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [token, isLoading]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [setDeferredPrompt]);

  // Si está refrescando el token proactivamente, mostramos loader nativo del CSS
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Si no hay token, el usuario necesita hacer login
  if (!token) {
    // Si aún no ha cargado la config de google, esperamos en login
    if (!configLoaded) {
       return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><div className="spinner" /></div>;
    }
    const loginNode = <LoginPage googleEnabled={!!googleClientId} />;
    return googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {loginNode}
      </GoogleOAuthProvider>
    ) : loginNode;
  }

  // Si hay token, renderizamos la app directamente
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        containerStyle={{
          top: 70,
          left: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-glass-strong, rgba(17, 24, 39, 0.95))',
            color: 'var(--text-primary, #f1f5f9)',
            border: '1px solid var(--border-medium, rgba(255,255,255,0.1))',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="hub" element={<GlobalStudy />} />
          <Route path="study/:deckId" element={<Study />} />
          <Route path="hub/:deckId" element={<StudyHub />} />
          <Route path="hub/:deckId/guide" element={<StudyGuide />} />
          <Route path="hub/:deckId/explore" element={<StudyExplore />} />
          <Route path="hub/:deckId/quiz" element={<StudyQuiz />} />
          <Route path="hub/:deckId/chunked" element={<StudyChunkedQuiz />} />
          <Route path="hub/:deckId/tutor" element={<StudyTutor />} />
          <Route path="add" element={<AddCard />} />
          <Route path="add/:deckId" element={<AddCard />} />
          <Route path="stats" element={<Stats />} />
          <Route path="browser" element={<Browser />} />
          <Route path="settings" element={<Settings />} />
          <Route path="templates" element={<Templates />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  useEffect(() => {
    document.body.className = 'dark-mode';
    const handleTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      if (x < 20 || x > window.innerWidth - 20) {
        e.preventDefault();
      }
    };
    
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) {
        document.body.classList.add('keyboard-open');
      }
    };
    
    const handleFocusOut = (e: FocusEvent) => {
      if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) {
        document.body.classList.remove('keyboard-open');
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const initialClientId = (envClientId && envClientId !== 'CHANGE_ME') ? envClientId : null;

  const [googleClientId, setGoogleClientId] = useState<string | null>(initialClientId);
  const [configLoaded, setConfigLoaded] = useState(!!initialClientId);

  useEffect(() => {
    if (!configLoaded) {
      // Usar ruta relativa para que funcione el proxy de vite
      fetch('/api/auth/config')
        .then((res: any) => {
          if (!res.ok) throw new Error('Failed config fetch');
          return res.json();
        })
        .then(data => {
          if (data.googleClientId && data.googleClientId !== 'CHANGE_ME') {
            setGoogleClientId(data.googleClientId);
          }
          setConfigLoaded(true);
        })
        .catch(err => {
          console.error("Error al cargar la config de auth:", err);
          setConfigLoaded(true); // Always unblock even if it fails
        });
    }
  }, [configLoaded]);

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <AppContent googleClientId={googleClientId} configLoaded={configLoaded} />
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}
