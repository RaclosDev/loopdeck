import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.jsx'

// Force clean old caches aggressively
if (window.caches) {
  caches.keys().then((names) => {
    for (let name of names) {
      // Solo borrar cachés de workbox antiguas si es necesario, 
      // pero para estar seguros borramos todo lo que parezca de vite-pwa
      if (name.includes('workbox') || name.includes('vite')) {
        caches.delete(name);
      }
    }
  });
}

if ('serviceWorker' in navigator) {
  // Use vite-plugin-pwa's virtual register to handle auto-updates properly
  const updateSW = registerSW({
    onNeedRefresh() {
      // Force refresh when new content is available
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
      staleTime: 60_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
