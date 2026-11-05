import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Resíduos das versões antigas (Vercel/planilha e flag de sessão local).
// A sessão agora é gerenciada pelo Firebase Auth.
try {
  localStorage.removeItem('banco-de-aulas:sheets-config')
  localStorage.removeItem('banco-de-aulas:session')
} catch {
  // Navegador sem localStorage.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sem service worker o app continua funcionando, só não fica offline.
    })
  })
}
