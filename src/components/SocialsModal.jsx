import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import instagramIcon from '@/assets/instagram-2-1-logo-svgrepo-com.svg'
import discordIcon from '@/assets/discord-icon-svgrepo-com.svg'
import { SOCIAL_LINKS } from '@/lib/socialLinks'
import styles from './SocialsModal.module.css'

const OPEN_EVENT = 'cyfernode:open-socials-modal'

const SOCIAL_ITEMS = [
  {
    key: 'instagram',
    hint: 'Follow updates and highlights',
    icon: instagramIcon,
  },
  {
    key: 'discord',
    hint: 'Join the community server',
    icon: discordIcon,
  },
]

export function SocialsModal() {
  const titleId = useId()
  const descId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.documentElement.classList.add('social-modal-open')
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.documentElement.classList.remove('social-modal-open')
      document.body.style.overflow = previousOverflow
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
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.top}>
          <div>
            <h2 className={styles.title} id={titleId}>Socials</h2>
            <p className={styles.subtitle} id={descId}>
              Connect with Cyfernode on Instagram and Discord.
            </p>
          </div>
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
          {SOCIAL_ITEMS.map(({ key, hint, icon }) => {
            const social = SOCIAL_LINKS[key]
            return (
              <a
                key={key}
                className={styles.link}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.icon}>
                  <img src={icon} alt="" className={styles.iconImage} />
                </span>
                <span>
                  <span className={styles.label}>{social.label}</span>
                  <span className={styles.hint}>{hint}</span>
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
