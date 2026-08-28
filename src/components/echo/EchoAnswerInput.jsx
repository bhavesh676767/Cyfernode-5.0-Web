import { useState } from 'react'
import {
  getIntermediateResponse,
  isEmptyAnswer,
  isLocallyRejectedAnswer,
} from '@/levels/echo/echo.validate'
import { submitEchoAnswer } from '@/lib/hunt/progress'
import styles from './EchoAnswerInput.module.css'

/**
 * @param {{
 *   validationId: string,
 *   disabled?: boolean,
 *   onSolved: () => void,
 * }} props
 */
export function EchoAnswerInput({ validationId, disabled = false, onSolved }) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [kind, setKind] = useState('neutral')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (disabled || submitting) return

    if (isEmptyAnswer(value)) {
      setMessage('')
      setKind('neutral')
      return
    }

    if (isLocallyRejectedAnswer(value)) {
      setMessage(getIntermediateResponse())
      setKind('intermediate')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const result = await submitEchoAnswer(value, validationId)
      if (!result.ok) {
        setMessage(result.error || 'Could not verify answer.')
        setKind('error')
        return
      }
      if (result.correct) {
        onSolved()
        return
      }
      setMessage('Incorrect.')
      setKind('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <span className={styles.label}>Enter answer</span>
      <div className={styles.row}>
        <input
          className={styles.input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled || submitting}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="echo-answer-message"
        />
        <button type="submit" className={styles.submit} disabled={disabled || submitting}>
          SUBMIT
        </button>
      </div>
      <p
        id="echo-answer-message"
        className={`${styles.message} ${kind === 'error' ? styles.error : ''} ${kind === 'intermediate' ? styles.intermediate : ''}`}
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  )
}
