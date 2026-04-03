import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAuth } from '@/lib/supabase/auth'

// Inicijalizacija auth prije rendera
initAuth()
  .catch(err => console.error('Auth inicijalizacija neuspješna:', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
