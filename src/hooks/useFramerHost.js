import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { syncFramerHost } from '@/lib/framerHost'

export function useFramerHost() {
  const { pathname } = useLocation()

  useEffect(() => {
    syncFramerHost(pathname)
  }, [pathname])
}
