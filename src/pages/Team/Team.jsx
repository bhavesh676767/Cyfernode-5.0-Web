import { useEffect, useState } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Preloader } from '@/components/Preloader'

export function Team() {
  const [loading, setLoading] = useState(true)
  useDocumentTitle('Team')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <Preloader loading={loading} />
  }

  return null
}
