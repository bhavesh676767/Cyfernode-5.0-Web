import { deliverableIsComplete } from '@/lib/submission/validation'
import styles from '../Submission.module.css'

export function SubmissionReview({ event, entries, onBack, onConfirm, busy }) {
  return (
    <section className={styles.panel} aria-labelledby="review-title">
      <h2 id="review-title">Review {event.name}</h2>
      <p className={styles.lede}>Check each item. Final submit locks the submission.</p>
      <ul className={styles.reviewList}>
        {event.event_deliverables.map((deliverable) => {
          const entry = entries[deliverable.id]
          const complete = deliverableIsComplete(deliverable, entry)
          let detail = 'Not added'
          if (deliverable.type === 'file' && entry?.file_name) detail = entry.file_name
          if (deliverable.type !== 'file' && entry?.value) detail = entry.value
          return (
            <li key={deliverable.id}>
              <strong>
                {deliverable.name}
                {deliverable.required ? ' · Required' : ' · Optional'}
                {complete ? ' · Ready' : ' · Missing'}
              </strong>
              <span className={styles.helper}>{detail}</span>
            </li>
          )
        })}
      </ul>
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.buttonSecondary}`} type="button" onClick={onBack} disabled={busy}>
          Back to form
        </button>
        <button className={styles.button} type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Submitting…' : 'Final submit'}
        </button>
      </div>
    </section>
  )
}
