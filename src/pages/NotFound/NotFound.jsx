import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './NotFound.module.css'

export function NotFound() {
  useDocumentTitle('Not found')

  return (
    <Container className={styles.wrap}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.copy}>That route is not part of CyferNode yet.</p>
      <p>
        <Button to="/">Back home</Button>
      </p>
    </Container>
  )
}
