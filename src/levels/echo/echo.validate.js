import { echoConfig } from './echo.config.js'

const INTERMEDIATE = echoConfig.extraction.intermediate.toUpperCase()

/** Answers rejected client-side before server round-trip. */
const LOCAL_REJECTED = new Set([
  INTERMEDIATE,
  'LOOK BACK',
  'LOOKBACK',
])

export function normalizeHuntAnswer(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

export function getIntermediateResponse() {
  return 'That\'s not the end.'
}

export function isLocallyRejectedAnswer(value) {
  return LOCAL_REJECTED.has(normalizeHuntAnswer(value))
}

export function isEmptyAnswer(value) {
  return !normalizeHuntAnswer(value)
}
