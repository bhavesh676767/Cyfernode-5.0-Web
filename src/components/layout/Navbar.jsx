import { Link, useLocation } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import styles from './Navbar.module.css'

export function Navbar() {
  const { pathname } = useLocation()
  const isRegisterPage = pathname === '/register'

  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link to="/" className={styles.brand}>
          CYFERNODE
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          <Link to="/" className={styles.link}>Home</Link>
          <a className={styles.link} href="/#events">Events</a>
          <a className={styles.link} href="/#team">Team</a>
          <a className={styles.link} href="/#timeline">Timeline</a>
        </nav>
        <Link
          to="/register"
          className={`${styles.register} ${isRegisterPage ? styles.registerActive : ''}`}
          aria-current={isRegisterPage ? 'page' : undefined}
        >
          Register <span aria-hidden="true">↗</span>
        </Link>
      </Container>
    </header>
  )
}
