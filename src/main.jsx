import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('🎉 Hay una nueva versión de LoopDeck disponible. ¿Quieres recargar la página para actualizar ahora?')) {
      updateSW(true)
    }
  },
  onRegistered(r) {
    if (r) {
      // Check for updates every 5 minutes while the app is open
      setInterval(() => {
        r.update()
      }, 5 * 60 * 1000)
    }
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
