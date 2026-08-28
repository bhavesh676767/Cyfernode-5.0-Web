import { EchoAudioPlayer } from './EchoAudioPlayer'
import styles from './EchoInspectionPanel.module.css'

/**
 * @param {{
 *   label: string,
 *   audio: Parameters<typeof EchoAudioPlayer>[0]['audio'],
 *   config: Parameters<typeof EchoAudioPlayer>[0]['config'],
 *   onClose: () => void,
 * }} props
 */
export function EchoInspectionPanel({ label, audio, config, onClose }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Audio inspection">
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{label}</span>
          <button type="button" className={styles.close} onClick={onClose}>CLOSE</button>
        </div>
        <EchoAudioPlayer audio={audio} config={config} />
      </div>
    </div>
  )
}
