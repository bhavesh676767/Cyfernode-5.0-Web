import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SUPABASE_ANON_KEY, REQUEST_INVITE_ENDPOINT } from '@/lib/supabasePublic'
import { lockPageScroll } from '@/lib/scrollLock'
import styles from './InviteRequestModal.module.css'

const OPEN_EVENT = 'cyfernode:open-invite-modal'

export function openInviteRequestModal() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

async function submitInviteRequest(email) {
  const res = await fetch(REQUEST_INVITE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}

export function InviteRequestModal() {
  const titleId = useId()
  const descId = useId()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      setEmail('')
      setError('')
      setSuccess('')
    }

    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const unlock = lockPageScroll('invite-modal-open')
    window.setTimeout(() => inputRef.current?.focus(), 0)

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

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your school email address.')
      return
    }

    setSubmitting(true)
    try {
      const data = await submitInviteRequest(trimmed)
      setSuccess(data.message || 'Invite request received.')
      setEmail('')
    } catch (err) {
      setError(err.message || 'Could not submit request.')
    } finally {
      setSubmitting(false)
    }
  }

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
            <h2 className={styles.title} id={titleId}>Request invite</h2>
            <p className={styles.subtitle} id={descId}>
              Enter your school&apos;s official email address. We&apos;ll send your registration invite there.
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

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="invite-school-email">
            School email
          </label>
          <input
            ref={inputRef}
            id="invite-school-email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="principal@school.edu.in"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            required
          />

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {success ? <p className={styles.success} role="status">{success}</p> : null}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.primary} disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
