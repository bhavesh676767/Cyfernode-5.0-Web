import { Container } from '@/components/ui/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import styles from './Projects.module.css'

const EVENTS = ['Hackathon', 'Design Sprint', 'Robotics', 'Quiz']

export function Projects() {
  useDocumentTitle('Projects')

  return (
    <Container>
      <p className={styles.kicker}>Lineup</p>
      <h1 className={styles.title}>Projects & events</h1>
      <p className={styles.copy}>
        The 2026 programme is still landing in React. This route is ready for event cards,
        registrations, and schedules without touching the Framer homepage.
      </p>
      <ul className={styles.list}>
        {EVENTS.map((event) => (
          <li key={event} className={styles.item}>
            {event}
          </li>
        ))}
      </ul>
    </Container>
  )
}
