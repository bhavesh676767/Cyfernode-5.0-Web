import { useState } from 'react'
import styles from './EchoTranscript.module.css'

/**
 * @param {{
 *   transcript: import('../../levels/echo/echo.config.js').echoConfig['transcript'],
 *   onInspect: () => void,
 * }} props
 */
export function EchoTranscript({ transcript, onInspect }) {
  const [open, setOpen] = useState(false)

  if (!transcript.enabled) return null

  return (
    <div>
      <button type="button" className={styles.transcriptBtn} onClick={() => setOpen((v) => !v)}>
        TRANSCRIPT
      </button>
      {open && (
        <div className={styles.panel}>
          <div>TRANSCRIPT</div>
          <div>{transcript.text}</div>
          <div>
            Last detected word:{' '}
            <button
              type="button"
              className={styles.lastWord}
              onClick={onInspect}
              aria-label="Last detected word"
            >
              {transcript.lastDetectedWord}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
