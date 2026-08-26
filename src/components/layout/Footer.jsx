import { Container } from '@/components/ui/Container'
import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} aria-hidden="true" />
      <Container className={styles.inner}>
        <div className={styles.contact}>
          <p className={styles.prompt}>Connect?</p>
          <a className={styles.email} href="mailto:cyfernode.catechize@gmail.com">
            cyfernode.catechize@gmail.com
          </a>
        </div>
        <nav className={styles.links} aria-label="Footer navigation">
          <Link to="/">Home</Link>
        </nav>
        <p className={styles.copy}>©2026 CYFERNODE .All rights reserved.</p>
      </Container>
    </footer>
  )
}
