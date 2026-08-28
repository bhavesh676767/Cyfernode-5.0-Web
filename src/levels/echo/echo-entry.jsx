import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EchoPage } from '@/components/echo/EchoPage'
import '@/styles/globals.css'

const root = document.getElementById('echo-root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <EchoPage />
    </StrictMode>,
  )
}
