import { FileUploader } from './FileUploader'
import { TextInput } from './TextInput'
import { UrlInput } from './UrlInput'
import styles from '../Submission.module.css'

export function DeliverableCard({
  deliverable,
  entry,
  error,
  progress,
  disabled,
  onUrlChange,
  onTextChange,
  onFile,
  onRemove,
}) {
  return (
    <article className={styles.card} aria-labelledby={`${deliverable.key}-title`}>
      <div className={styles.cardHeader}>
        <h2 id={`${deliverable.key}-title`}>{deliverable.name}</h2>
        <span className={`${styles.badge} ${deliverable.required ? styles.badgeRequired : ''}`}>
          {deliverable.required ? 'Required' : 'Optional'}
        </span>
      </div>
      {deliverable.description ? <p className={styles.description}>{deliverable.description}</p> : null}
      {deliverable.type !== 'text' && deliverable.helper_text ? (
        <p className={styles.helper}>{deliverable.helper_text}</p>
      ) : null}
      {deliverable.type === 'file' ? (
        <FileUploader
          deliverable={deliverable}
          entry={entry}
          error={error}
          progress={progress}
          disabled={disabled}
          onFile={onFile}
          onRemove={onRemove}
        />
      ) : null}
      {deliverable.type === 'url' ? (
        <UrlInput
          deliverable={deliverable}
          value={entry?.value || ''}
          error={error}
          disabled={disabled}
          onChange={onUrlChange}
        />
      ) : null}
      {deliverable.type === 'text' ? (
        <TextInput
          deliverable={deliverable}
          value={entry?.value || ''}
          error={error}
          disabled={disabled}
          onChange={onTextChange}
        />
      ) : null}
    </article>
  )
}
