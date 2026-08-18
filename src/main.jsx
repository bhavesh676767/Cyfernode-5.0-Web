import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { canonicalizeIndexHtmlUrl, ensureReactRoot } from '@/lib/framerHost'
import '@/styles/globals.css'

canonicalizeIndexHtmlUrl()

createRoot(ensureReactRoot()).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
