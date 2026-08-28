import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { App } from '@/App'
import { blockFramerBadge } from '@/lib/blockFramerBadge'
import { canonicalizeIndexHtmlUrl, enableRegistrationTrigger, enableInviteRequestTrigger, ensureReactRoot } from '@/lib/framerHost'
import { InviteRequestModal } from '@/components/InviteRequestModal'
import { SocialsModal } from '@/components/SocialsModal'
import '@/styles/globals.css'

canonicalizeIndexHtmlUrl()
enableRegistrationTrigger()
enableInviteRequestTrigger()
blockFramerBadge()

createRoot(ensureReactRoot()).render(
  <StrictMode>
    <App />
    <InviteRequestModal />
    <SocialsModal />
    <SpeedInsights />
  </StrictMode>,
)
