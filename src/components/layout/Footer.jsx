import { Container } from '@/components/ui/Container'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <p className={styles.copy}>©2026 CYFERNODE. All rights reserved.</p>
        <p className={styles.meta}>Hosted by Summer Fields School</p>
      </Container>
    </footer>
  )
}
