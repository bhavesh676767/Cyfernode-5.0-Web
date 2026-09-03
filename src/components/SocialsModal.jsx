import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import instagramIcon from '@/assets/instagram-2-1-logo-svgrepo-com.svg'
import discordIcon from '@/assets/discord-icon-svgrepo-com.svg'
import { SOCIAL_LINKS } from '@/lib/socialLinks'
import { lockPageScroll } from '@/lib/scrollLock'
import styles from './SocialsModal.module.css'

const OPEN_EVENT = 'cyfernode:open-socials-modal'

const SOCIAL_ITEMS = [
  { key: 'instagram', icon: instagramIcon },
  { key: 'discord', icon: discordIcon },
]

export function SocialsModal() {
  const titleId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, onOpen)

    if (window.location.hash === '#socials' || window.location.search.indexOf('action=socials') !== -1) {
      setOpen(true)
      try {
        window.history.replaceState(null, '', window.location.pathname)
      } catch (e) {}
    }

    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const unlock = lockPageScroll('social-modal-open')

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      unlock()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.top}>
          <h2 className={styles.title} id={titleId}>Socials</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className={styles.links}>
          {SOCIAL_ITEMS.map(({ key, icon }) => {
            const social = SOCIAL_LINKS[key]
            return (
              <a
                key={key}
                className={styles.link}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={icon} alt="" className={styles.icon} />
                <span>{social.label}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
