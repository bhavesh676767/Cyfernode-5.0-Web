import { EchoWaveform } from './EchoWaveform'
import { EchoChannelSelector } from './EchoChannelSelector'
import styles from './EchoAudioPlayer.module.css'

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * @param {import('../../levels/echo/useEchoAudio.js').useEchoAudio extends (...args: any) => infer R ? R : never} audio
 * @param {{ channels: string[] }} config
 */
export function EchoAudioPlayer({ audio, config }) {
  const disabled = audio.status !== 'ready'

  return (
    <div className={styles.player}>
      <EchoWaveform
        peaks={audio.peaks}
        duration={audio.duration}
        currentTime={audio.currentTime}
        onSeek={audio.seek}
        disabled={disabled}
      />

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.playBtn}
          onClick={audio.togglePlay}
          disabled={disabled}
        >
          {audio.playing ? 'PAUSE' : 'PLAY'}
        </button>
        <span className={styles.time}>
          {formatTime(audio.currentTime)} / {formatTime(audio.duration)}
        </span>
      </div>

      <div className={styles.meta}>
        <label htmlFor="echo-volume">Volume</label>
        <input
          id="echo-volume"
          className={styles.slider}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audio.volume}
          onChange={(event) => audio.changeVolume(Number(event.target.value))}
          disabled={disabled}
        />
      </div>

      <div className={styles.meta}>
        <label htmlFor="echo-speed">Speed</label>
        <select
          id="echo-speed"
          value={audio.playbackRate}
          onChange={(event) => audio.changeRate(Number(event.target.value))}
          disabled={disabled}
        >
          {config.playbackSpeeds.map((rate) => (
            <option key={rate} value={rate}>{rate}x</option>
          ))}
        </select>
      </div>

      <EchoChannelSelector
        channel={audio.channel}
        channels={config.audio.channels}
        onChange={audio.changeChannel}
        isStereo={audio.isStereo}
      />
    </div>
  )
}
