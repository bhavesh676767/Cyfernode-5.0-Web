import { useId } from 'react'
import { parsePublicUrl } from '@/lib/submission/validation'
import styles from '../Submission.module.css'

export function UrlInput({ deliverable, value, error, disabled, onChange }) {
  const inputId = useId()
  const hintId = useId()
  const parsed = value ? parsePublicUrl(value) : null
  const platforms = (deliverable.accepted_link_types || []).join(', ')

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>Link</label>
      <input
        id={inputId}
        className={styles.control}
        type="url"
        inputMode="url"
        placeholder={deliverable.placeholder || 'https://'}
        value={value || ''}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={hintId} className={styles.helper}>
        {platforms ? `Accepted: ${platforms}. ` : ''}
        Any public http or https link is allowed.
      </p>
      {parsed?.ok && parsed.platform ? <p className={styles.platform}>Detected: {parsed.platform}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  )
}
