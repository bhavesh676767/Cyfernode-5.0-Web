import { BrowserRouter } from 'react-router-dom'
import { useFramerHost } from '@/hooks/useFramerHost'
import { AppRouter } from '@/router/AppRouter'

function HostedApp() {
  useFramerHost()
  return <AppRouter />
}

export function App() {
  return (
    <BrowserRouter>
      <HostedApp />
    </BrowserRouter>
  )
}
