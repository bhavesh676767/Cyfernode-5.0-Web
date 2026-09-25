import { deliverableIsComplete } from '@/lib/submission/validation'
import styles from '../Submission.module.css'

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  reviewed: 'Reviewed',
  disqualified: 'Disqualified',
}

function formatWhen(value) {
  if (!value) return 'Not submitted yet'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function SubmissionSuccess({ event, submission, deliverables = [], entries = {}, onChooseAnother }) {
  return (
    <section className={styles.panel} aria-labelledby="success-title">
      <p className={styles.kicker}>Submission received</p>
      <h2 id="success-title">{event?.name || 'Submission'}</h2>
      <p className={styles.statusLine}>
        <span className={`${styles.pill} ${styles.pillDone}`}>{STATUS_LABELS[submission.status] || submission.status}</span>
      </p>
      <p className={styles.lede}>
        Reference {submission.reference_code || submission.id}. This team’s submission is locked.
      </p>
      <p className={styles.helper}>
        Submitted by {submission.submitted_by_name || 'your account'} · {formatWhen(submission.submitted_at)}
      </p>
      <ul className={styles.reviewList}>
        {deliverables.map((deliverable) => {
          const entry = entries[deliverable.id]
          const complete = deliverableIsComplete(deliverable, entry)
          let detail = 'Not added'
          if (deliverable.type === 'file' && entry?.file_name) detail = entry.file_name
          if (deliverable.type !== 'file' && entry?.value) detail = entry.value
          return (
            <li key={deliverable.id}>
              <strong>{deliverable.name}{complete ? '' : ' · Missing'}</strong>
              <span className={styles.helper}>{detail}</span>
            </li>
          )
        })}
      </ul>
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.buttonSecondary}`} type="button" onClick={onChooseAnother}>
          Back to events
        </button>
      </div>
    </section>
  )
}
