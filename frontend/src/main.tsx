import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import './tailwind.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

import { applyThemeColor } from './utils/colorHelper';

// Initialize theme before rendering to avoid FOUC
const savedColor = localStorage.getItem('loopdeck_custom_color');
if (savedColor) {
  applyThemeColor(savedColor);
}

// Force clean old caches aggressively
if (window.caches) {
  caches.keys().then((names) => {
    for (let name of names) {
      if (name.includes('workbox') || name.includes('vite')) {
        caches.delete(name);
      }
    }
  });
}

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 120_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
