import { useId } from 'react'
import styles from '../Submission.module.css'

export function TextInput({ deliverable, value, error, disabled, onChange }) {
  const inputId = useId()
  const hintId = useId()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>{deliverable.name}</label>
      <textarea
        id={inputId}
        className={styles.control}
        rows={5}
        placeholder={deliverable.placeholder || ''}
        value={value || ''}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={hintId} className={styles.helper}>{deliverable.helper_text}</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  )
}
