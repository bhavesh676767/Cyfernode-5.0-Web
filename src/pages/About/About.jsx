import { Container } from '@/components/ui/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './About.module.css'

export function About() {
  useDocumentTitle('About')

  return (
    <Container>
      <p className={styles.kicker}>Cyfernauts</p>
      <h1 className={styles.title}>About CyferNode</h1>
      <p className={styles.copy}>
        CyferNode is the annual tech event hosted by Cyfernauts, the tech club of Summer
        Fields School. It is a place to take a wild idea and turn it into something real —
        across 10+ events in 2026.
      </p>
    </Container>
  )
}
