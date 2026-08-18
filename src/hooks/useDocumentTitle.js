import { useEffect } from 'react'

const BASE_TITLE = 'Cyfernode.com | Summer Fields School'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Cyfernode` : BASE_TITLE
  }, [title])
}
