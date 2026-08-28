import styles from './EchoCompletion.module.css'

/**
 * @param {{ nextLevelPath: string }} props
 */
export function EchoCompletion({ nextLevelPath }) {
  return (
    <div className={styles.box}>
      <h2 className={styles.title}>ECHO</h2>
      <p className={styles.status}>SOLVED</p>
      <a className={styles.continue} href={nextLevelPath}>CONTINUE</a>
    </div>
  )
}
