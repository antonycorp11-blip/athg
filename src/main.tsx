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
import { analytics } from '@/services/analytics'
import { auth } from '@/services/backend/auth'
import { remote } from '@/services/backend/remote'
import { startSync } from '@/services/backend/sync'
import { router, prefetchCoreRoutes } from './routes'

// Perfil local (nome/avatar) até a conta carregar; jogar exige conta.
ensureIdentity()
// Backend: sincroniza quando houver sessão; eventos relevantes vão para o banco.
startSync()
auth.boot()
analytics.addSink({ track: (event, props) => remote.trackEvent(event, props) })

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
