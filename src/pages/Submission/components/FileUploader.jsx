import { useId, useState } from 'react'
import { fileExtension, formatBytes, validateFile, validatePlainTextWords } from '@/lib/submission/validation'
import styles from '../Submission.module.css'

export function FileUploader({
  deliverable,
  entry,
  error,
  progress,
  disabled,
  onFile,
  onRemove,
}) {
  const inputId = useId()
  const [active, setActive] = useState(false)
  const [localError, setLocalError] = useState('')
  const extensions = (deliverable.accepted_file_types || []).join(', ')
  const shownError = localError || error

  async function acceptFile(file) {
    setLocalError('')
    const check = validateFile(file, deliverable)
    if (!check.ok) {
      setLocalError(check.error)
      return
    }
    if (deliverable.max_words && fileExtension(file.name) === 'txt') {
      const text = await file.text()
      const words = validatePlainTextWords(text, deliverable.max_words)
      if (!words.ok) {
        setLocalError(words.error)
        return
      }
    }
    await onFile(file)
  }

  return (
    <div className={styles.field}>
      <label
        className={`${styles.drop} ${active ? styles.dropActive : ''}`}
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setActive(false)
          const file = event.dataTransfer.files?.[0]
          if (file && !disabled) acceptFile(file)
        }}
      >
        <strong>{active ? 'Drop the file here' : 'Drag and drop or browse'}</strong>
        <span className={styles.helper}>
          {extensions ? extensions.toUpperCase() : 'File'}
          {deliverable.max_file_size_mb ? ` · Max ${deliverable.max_file_size_mb} MB` : ''}
        </span>
        <input
          id={inputId}
          type="file"
          disabled={disabled}
          accept={(deliverable.accepted_file_types || []).map((ext) => `.${ext}`).join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) acceptFile(file)
          }}
        />
      </label>
      {typeof progress === 'number' ? (
        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {entry?.file_name ? (
        <div className={styles.fileRow}>
          <p className={styles.fileName}>
            <strong>{entry.file_name}</strong>
            {entry.file_size ? ` · ${formatBytes(entry.file_size)}` : ''}
            {' · Uploaded'}
          </p>
          <button className={styles.textButton} type="button" disabled={disabled} onClick={onRemove}>
            Remove
          </button>
        </div>
      ) : null}
      {shownError ? <p className={styles.error} role="alert">{shownError}</p> : null}
    </div>
  )
}
