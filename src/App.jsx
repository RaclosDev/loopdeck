import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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
import AuthPage from './pages/AuthPage';
import Browser from './pages/Browser';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import Farm from './pages/Farm';
import useAuthStore from './store/useAuthStore';
import useStore from './store/useStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const updateUser = useAuthStore(s => s.updateUser);
  const setDeferredPrompt = useStore(s => s.setDeferredPrompt);
  const { isDarkMode } = useStore();

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  useEffect(() => {
    if (isAuthenticated) {
      import('./services/api').then(({ usersApi }) => {
        usersApi.dailyLogin()
          .then(userData => updateUser(userData))
          .catch(err => console.error("Error en daily login", err));
      });
    }
  }, [isAuthenticated, updateUser]);

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
                  <Route path="/hub" element={<GlobalStudy />} />
                  <Route path="/study/:deckId" element={<Study />} />
                  <Route path="/hub/:deckId" element={<StudyHub />} />
                  <Route path="/hub/:deckId/guide" element={<StudyGuide />} />
                  <Route path="/hub/:deckId/explore" element={<StudyExplore />} />
                  <Route path="/hub/:deckId/quiz" element={<StudyQuiz />} />
                  <Route path="/hub/:deckId/chunked" element={<StudyChunkedQuiz />} />
                  <Route path="/hub/:deckId/tutor" element={<StudyTutor />} />
                  <Route path="/add" element={<AddCard />} />
                  <Route path="/add/:deckId" element={<AddCard />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/browser" element={<Browser />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/farm" element={<Farm />} />
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
