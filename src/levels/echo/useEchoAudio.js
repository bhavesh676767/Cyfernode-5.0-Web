import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * @param {string} src
 */
export function useEchoAudio(src) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const contextRef = useRef(/** @type {AudioContext | null} */ (null))
  const sourceRef = useRef(/** @type {MediaElementAudioSourceNode | null} */ (null))
  const splitterRef = useRef(/** @type {ChannelSplitterNode | null} */ (null))
  const mergerRef = useRef(/** @type {ChannelMergerNode | null} */ (null))
  const gainLRef = useRef(/** @type {GainNode | null} */ (null))
  const gainRRef = useRef(/** @type {GainNode | null} */ (null))
  const bufferRef = useRef(/** @type {AudioBuffer | null} */ (null))

  const [status, setStatus] = useState('idle')
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [channel, setChannel] = useState('stereo')
  const [peaks, setPeaks] = useState(/** @type {number[]} */ ([]))
  const [isStereo, setIsStereo] = useState(false)

  const applyChannel = useCallback((mode) => {
    const gainL = gainLRef.current
    const gainR = gainRRef.current
    if (!gainL || !gainR) return

    if (mode === 'left') {
      gainL.gain.value = 1
      gainR.gain.value = 0
    } else if (mode === 'right') {
      gainL.gain.value = 0
      gainR.gain.value = 1
    } else {
      gainL.gain.value = 1
      gainR.gain.value = 1
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audio.src = src
    audioRef.current = audio

    const onLoaded = () => {
      setDuration(audio.duration || 0)
      setStatus('ready')
    }
    const onError = () => setStatus('missing')
    const onTime = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('error', onError)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      contextRef.current?.close()
    }
  }, [src])

  useEffect(() => {
    if (status !== 'ready') return
    let cancelled = false

    async function decodePeaks() {
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error('fetch failed')
        const arrayBuffer = await response.arrayBuffer()
        const context = new AudioContext()
        const buffer = await context.decodeAudioData(arrayBuffer.slice(0))
        if (cancelled) {
          await context.close()
          return
        }
        bufferRef.current = buffer
        setIsStereo(buffer.numberOfChannels >= 2)

        const channelData = buffer.getChannelData(0)
        const samples = 240
        const block = Math.floor(channelData.length / samples)
        const nextPeaks = []
        for (let i = 0; i < samples; i += 1) {
          let peak = 0
          const start = i * block
          for (let j = 0; j < block; j += 1) {
            peak = Math.max(peak, Math.abs(channelData[start + j] || 0))
          }
          nextPeaks.push(peak)
        }
        setPeaks(nextPeaks)
        await context.close()
      } catch {
        if (!cancelled) setPeaks([])
      }
    }

    decodePeaks()
    return () => {
      cancelled = true
    }
  }, [src, status])

  const ensureContext = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!contextRef.current) {
      const context = new AudioContext()
      const source = context.createMediaElementSource(audio)
      const splitter = context.createChannelSplitter(2)
      const merger = context.createChannelMerger(2)
      const gainL = context.createGain()
      const gainR = context.createGain()

      source.connect(splitter)
      splitter.connect(gainL, 0)
      splitter.connect(gainR, 1)
      gainL.connect(merger, 0, 0)
      gainR.connect(merger, 0, 1)
      merger.connect(context.destination)

      contextRef.current = context
      sourceRef.current = source
      splitterRef.current = splitter
      mergerRef.current = merger
      gainLRef.current = gainL
      gainRRef.current = gainR
      applyChannel(channel)
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume()
    }
  }, [applyChannel, channel])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || status !== 'ready') return
    await ensureContext()
    if (audio.paused) await audio.play()
    else audio.pause()
  }, [ensureContext, status])

  const seek = useCallback((time) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(time, duration || 0))
    setCurrentTime(audio.currentTime)
  }, [duration])

  const changeVolume = useCallback((value) => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = value
    setVolume(value)
  }, [])

  const changeRate = useCallback((value) => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = value
    setPlaybackRate(value)
  }, [])

  const changeChannel = useCallback((mode) => {
    setChannel(mode)
    applyChannel(mode)
  }, [applyChannel])

  return {
    status,
    playing,
    duration,
    currentTime,
    volume,
    playbackRate,
    channel,
    peaks,
    isStereo,
    buffer: bufferRef.current,
    togglePlay,
    seek,
    changeVolume,
    changeRate,
    changeChannel,
  }
}
