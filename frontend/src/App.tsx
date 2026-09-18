import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GlobalStudy from './pages/GlobalStudy';
import Study from './pages/Study';
import StudyHub from './pages/StudyHub';
import StudyGuide from './pages/StudyGuide';
import StudyExplore from './pages/StudyExplore';
import StudyQuiz from './pages/StudyQuiz';
import StudyTutor from './pages/StudyTutor';
import StudyChunkedQuiz from './pages/StudyChunkedQuiz';
import AddCard from './pages/AddCard';
import Stats from './pages/Stats';
import Browser from './pages/Browser';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import LoginPage from './pages/LoginPage';
import { useEffect, useState } from 'react';
import api from './api/client';
import useStore, { BeforeInstallPromptEvent } from './store/useStore';

let currentAppVersion: string | null = null;

function AppContent() {
  const { token } = useAuth();
  const setDeferredPrompt = useStore(s => s.setDeferredPrompt);

  useEffect(() => {
    if (token) {
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
  }, [token]);

  useEffect(() => {
    if (token) {
      api.post('/users/daily-login')
        .then((res: any) => {
          // If we want to update the user context with streak, we'd do it here.
          // For now, it will be handled on next token refresh or manual context update
        })
        .catch(err => console.error("Error en daily login", err));
    }
  }, [token]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [setDeferredPrompt]);

  if (!token) {
    return <LoginPage />;
  }

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

  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (!googleClientId) {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, 5000);

      fetch(baseUrl + '/api/auth/config', { signal: controller.signal })
        .then((res: any) => {
          if (!res.ok) throw new Error('Failed config fetch');
          return res.json();
        })
        .then(data => {
          clearTimeout(timeoutId);
          if (data.googleClientId && data.googleClientId !== 'CHANGE_ME') {
            setGoogleClientId(data.googleClientId);
          } else {
            setAuthError(true);
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error("Error al cargar la config de auth:", err);
          setAuthError(true);
        });
    }
  }, [googleClientId]);

  if (authError && !googleClientId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--text-primary)', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '10px' }}>Error de conexión</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No se pudo cargar la configuración segura. Comprueba tu conexión y que el servidor esté online.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        Cargando configuración...
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
