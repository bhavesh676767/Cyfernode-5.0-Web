import styles from '../Submission.module.css'

export function EventSelector({ events, onSelect }) {
  if (!events.length) {
    return (
      <p className={styles.banner} role="status">
        No events are open. Run SUPABASE_SETUP.sql in the Supabase SQL Editor, then refresh.
      </p>
    )
  }

  return (
    <div className={styles.eventGrid} role="list">
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className={styles.eventButton}
          onClick={() => onSelect(event)}
        >
          <strong>{event.name}</strong>
          <span>{event.description}</span>
        </button>
      ))}
    </div>
  )
}
