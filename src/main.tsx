import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@fontsource-variable/inter'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import './styles/index.css'
import { I18nProvider } from '@/i18n/I18nProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ensureIdentity } from '@/services/profileService'
import { router, prefetchCoreRoutes } from './routes'

// Perfil local de convidado (play first: nada de cadastro para jogar).
ensureIdentity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
)

prefetchCoreRoutes()
