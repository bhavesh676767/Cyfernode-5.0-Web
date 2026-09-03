import styles from './Preloader.module.css'

export function Preloader({ loading = true, className = '' }) {
  if (!loading) return null

  return (
    <div className={`${styles.preloader} ${className}`} role="progressbar" aria-label="Loading page content">
      <div className={styles.inner}>
        <div className={styles.track}>
          <div className={styles.fill} />
        </div>
      </div>
    </div>
  )
}
