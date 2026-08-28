import { useEffect, useRef } from 'react'
import styles from './EchoWaveform.module.css'

/**
 * @param {{
 *   peaks: number[],
 *   duration: number,
 *   currentTime: number,
 *   onSeek: (time: number) => void,
 *   disabled?: boolean,
 * }} props
 */
export function EchoWaveform({ peaks, duration, currentTime, onSeek, disabled = false }) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const zoomRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || peaks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = wrap.clientWidth
    const height = wrap.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const zoom = zoomRef.current
    const visible = Math.max(1, Math.floor(peaks.length / zoom))
    const start = Math.max(0, peaks.length - visible)
    const slice = peaks.slice(start)
    const mid = height / 2

    ctx.strokeStyle = 'rgba(232, 230, 225, 0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    slice.forEach((peak, index) => {
      const x = (index / Math.max(slice.length - 1, 1)) * width
      const amp = peak * (height * 0.42)
      ctx.moveTo(x, mid - amp)
      ctx.lineTo(x, mid + amp)
    })
    ctx.stroke()
  }, [peaks])

  function seekFromEvent(event) {
    if (disabled || !duration) return
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const x = 'touches' in event ? event.touches[0].clientX : event.clientX
    const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  const playhead = duration ? `${(currentTime / duration) * 100}%` : '0%'

  return (
    <div>
      <div
        ref={wrapRef}
        className={styles.waveform}
        onClick={seekFromEvent}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSeek(Math.min(duration, currentTime + 1))
          }
        }}
        role="slider"
        aria-label="Waveform seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={disabled ? -1 : 0}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.playhead} style={{ left: playhead }} />
      </div>
      <div className={styles.zoom}>
        <button type="button" onClick={() => { zoomRef.current = Math.min(4, zoomRef.current + 0.5) }}>
          ZOOM IN
        </button>
        <button type="button" onClick={() => { zoomRef.current = Math.max(1, zoomRef.current - 0.5) }}>
          ZOOM OUT
        </button>
      </div>
    </div>
  )
}
