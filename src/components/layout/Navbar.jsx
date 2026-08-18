import { NavLink } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { NAV_LINKS } from '@/lib/nav'
import { cn } from '@/utils/cn'
import styles from './Navbar.module.css'

export function Navbar() {
  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          CYFERNODE
        </NavLink>
        <nav className={styles.nav} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cn(styles.link, isActive && styles.active)}
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </Container>
    </header>
  )
}
