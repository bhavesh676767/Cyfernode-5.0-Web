import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { lockPageScroll } from '@/lib/scrollLock'
import styles from './MobileNav.module.css'

const SOCIALS_EVENT = 'cyfernode:open-socials-modal'

const NAV_ITEMS = [
  { id: 'home', num: '01', label: 'Home' },
  { id: 'prompts', num: '02', label: 'Prompts' },
  { id: 'socials', num: '03', label: 'Socials' },
  { id: 'team', num: '04', label: 'Team' },
]

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

  const hideOnPaths = ['/register', '/admin']
  if (hideOnPaths.includes(pathname)) return null

  const handleSelect = (id) => {
    setOpen(false)

    if (id === 'home') {
      window.location.assign('/')
      return
    }

    if (id === 'prompts') {
      window.location.assign('/prompts')
      return
    }

    if (id === 'socials') {
      if (window.location.pathname === '/' || window.location.pathname === '') {
        window.dispatchEvent(new CustomEvent(SOCIALS_EVENT))
      } else {
        window.location.assign('/#socials')
      }
      return
    }

    if (id === 'team') {
      window.location.assign('/team')
      return
    }

    if (id === 'register') {
      window.location.assign('/register')
      return
    }
  }

  return createPortal(
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.toggle} ${open ? styles.toggleOpen : ''}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.toggleIcon} aria-hidden="true">
          <span className={styles.barTop} />
          <span className={styles.barMid} />
          <span className={styles.barBot} />
        </span>
      </button>

      <div
        id={menuId}
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-hidden={!open}
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Menu</span>
        </div>

        <nav className={styles.nav} aria-label="Mobile Navigation">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.link}
              style={{ '--item-index': index }}
              onClick={() => handleSelect(item.id)}
            >
              <div className={styles.linkLeft}>
                <span className={styles.linkNum}>{item.num}</span>
                <span className={styles.linkLabel}>{item.label}</span>
              </div>
              <span className={styles.linkArrow} aria-hidden="true">↗</span>
            </button>
          ))}
        </nav>

        <div className={styles.panelFooter}>
          <button
            type="button"
            className={styles.registerButton}
            onClick={() => handleSelect('register')}
          >
            <span className={styles.registerLabel}>Register Now</span>
            <span className={styles.registerArrow} aria-hidden="true">→</span>
          </button>
        </div>
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
