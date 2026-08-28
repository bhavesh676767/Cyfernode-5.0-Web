import styles from './EchoAudioPlayer.module.css'

/**
 * @param {{
 *   channel: string,
 *   channels: string[],
 *   onChange: (mode: string) => void,
 *   isStereo: boolean,
 * }} props
 */
export function EchoChannelSelector({ channel, channels, onChange, isStereo }) {
  return (
    <div className={styles.meta}>
      <label htmlFor="echo-channel">Channel</label>
      <select
        id="echo-channel"
        value={channel}
        onChange={(event) => onChange(event.target.value)}
      >
        {channels.map((mode) => (
          <option key={mode} value={mode}>{mode.toUpperCase()}</option>
        ))}
      </select>
      {!isStereo && (
        <span className={styles.stereoNote}>Mono source detected</span>
      )}
    </div>
  )
}
