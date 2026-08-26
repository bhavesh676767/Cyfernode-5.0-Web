import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { blockFramerBadge } from '@/lib/blockFramerBadge'
import { canonicalizeIndexHtmlUrl, enableRegistrationTrigger, ensureReactRoot } from '@/lib/framerHost'
import '@/styles/globals.css'

canonicalizeIndexHtmlUrl()
enableRegistrationTrigger()
blockFramerBadge()

createRoot(ensureReactRoot()).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
