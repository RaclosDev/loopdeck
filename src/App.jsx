import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import AddCard from './pages/AddCard';
import Stats from './pages/Stats';
import AuthPage from './pages/AuthPage';
import Browser from './pages/Browser';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import useAuthStore from './store/useAuthStore';
import useStore from './store/useStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const setDeferredPrompt = useStore(s => s.setDeferredPrompt);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [setDeferredPrompt]);

  return (
    <Router>
      <Routes>
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/study/:deckId" element={<Study />} />
                  <Route path="/add" element={<AddCard />} />
                  <Route path="/add/:deckId" element={<AddCard />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/browser" element={<Browser />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
