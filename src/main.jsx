import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { blockFramerBadge } from '@/lib/blockFramerBadge'
import { canonicalizeIndexHtmlUrl, ensureReactRoot } from '@/lib/framerHost'
import '@/styles/globals.css'

canonicalizeIndexHtmlUrl()
blockFramerBadge()

createRoot(ensureReactRoot()).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
