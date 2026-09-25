/** Midnight, 1 October 2026, India Standard Time. Keep in sync with public/framer-cta.js. */
export const SUBMISSION_OPENS_AT = Date.parse('2026-10-01T00:00:00+05:30')

export function isSubmissionOpen(now = Date.now()) {
  return now >= SUBMISSION_OPENS_AT
}

export function formatSubmissionCountdown(now = Date.now()) {
  const total = Math.max(0, Math.floor((SUBMISSION_OPENS_AT - now) / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${clock}` : clock
}
