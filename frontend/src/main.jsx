import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ActiveLegacyProvider } from './context/ActiveLegacyProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ActiveLegacyProvider>
            <App />
          </ActiveLegacyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
