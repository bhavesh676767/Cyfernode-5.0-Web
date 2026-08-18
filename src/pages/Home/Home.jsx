import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/**
 * `/` is served by the existing Framer markup in index.html.
 * This page exists so the route table stays complete without cloning that document into React.
 */
export function Home() {
  useDocumentTitle()
  return null
}
