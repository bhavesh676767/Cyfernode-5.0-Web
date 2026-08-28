import { useState } from 'react'
import styles from './EchoHints.module.css'

/**
 * @param {{ hints: string[] }} props
 */
export function EchoHints({ hints }) {
  const [revealed, setRevealed] = useState(0)
  const [open, setOpen] = useState(false)

  function revealNext() {
    setOpen(true)
    setRevealed((count) => Math.min(count + 1, hints.length))
  }

  return (
    <div className={styles.hints}>
      {revealed < hints.length && (
        <button type="button" className={styles.toggle} onClick={revealNext}>
          NEED A HINT?
        </button>
      )}
      {open && revealed > 0 && (
        <ol className={styles.list}>
          {hints.slice(0, revealed).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
