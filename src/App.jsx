import { BrowserRouter } from 'react-router-dom'
import { MobileNav } from '@/components/MobileNav'
import { useFramerHost } from '@/hooks/useFramerHost'
import { AppRouter } from '@/router/AppRouter'

function HostedApp() {
  useFramerHost()
  return (
    <>
      <AppRouter />
      <MobileNav />
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <HostedApp />
    </BrowserRouter>
  )
}
