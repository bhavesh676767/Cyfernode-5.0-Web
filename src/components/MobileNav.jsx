import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { lockPageScroll } from '@/lib/scrollLock'
import styles from './MobileNav.module.css'

const SOCIALS_EVENT = 'cyfernode:open-socials-modal'
const TEAM_SELECTOR = '[data-framer-name="Team"]'

const NAV_ITEMS = [
  { id: 'team', label: 'Team' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'socials', label: 'Socials' },
]

function scrollToTeam() {
  const section = document.querySelector(TEAM_SELECTOR)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  window.location.assign('/#team')
}

export function MobileNav() {
  const menuId = useId()
  const rootRef = useRef(null)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const isHome = pathname === '/'

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return undefined

    const unlock = lockPageScroll('mobile-nav-open')

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const onPointerDown = (event) => {
      if (!(event.target instanceof Node)) return
      if (rootRef.current?.contains(event.target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)

    return () => {
      unlock()
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (!isHome) return null

  const handleSelect = (id) => {
    setOpen(false)

    if (id === 'team') {
      window.setTimeout(scrollToTeam, 180)
      return
    }

    if (id === 'prompts') {
      window.setTimeout(() => window.location.assign('/prompts'), 180)
      return
    }

    if (id === 'socials') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(SOCIALS_EVENT))
      }, 180)
    }
  }

  return createPortal(
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.toggle} ${open ? styles.toggleOpen : ''}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.toggleIcon} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div
        id={menuId}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-hidden={!open}
      >
        <nav className={styles.nav} aria-label="Mobile">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.link}
              style={{ '--item-index': index }}
              onClick={() => handleSelect(item.id)}
            >
              <span className={styles.linkLabel}>{item.label}</span>
              <span className={styles.linkArrow} aria-hidden="true">↗</span>
            </button>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
    </div>,
    document.body,
  )
}
