import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import './lib/monaco-setup'
import { initI18n, i18n } from './lib/i18n'
import { ThemeProvider } from './lib/theme'

initI18n()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <HashRouter>
          <App />
          <Toaster richColors position="top-right" />
        </HashRouter>
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
)
