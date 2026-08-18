import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './Contact.module.css'

export function Contact() {
  useDocumentTitle('Contact')

  return (
    <Container>
      <p className={styles.kicker}>Reach us</p>
      <h1 className={styles.title}>Contact</h1>
      <p className={styles.copy}>
        Questions about CyferNode, registrations, or the Cyfernauts club can land here as
        this route grows.
      </p>
      <p>
        <Button href="mailto:hello@cyfernode.com">Email the team</Button>
      </p>
    </Container>
  )
}
