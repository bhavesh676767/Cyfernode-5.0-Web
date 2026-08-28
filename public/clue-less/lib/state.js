import { VOID_WHITESPACE_MESSAGE } from './whitespace.js'

export const STORAGE_KEY = 'cyfernode-clue-less-progress'

export const LEVEL_ORDER = [
  'void',
  'echo',
  'mirror',
  'deceit',
  'context',
  'rabbit',
  'shift',
  'absence',
  'trace',
  'clue-less',
]


const defaultVoidState = () => ({
  started: false,
  discoveredVoid0: false,
  completed: false,
})

export function createDefaultProgress() {
  return {
    completed: [],
    void: defaultVoidState(),
  }
}

export function parseProgress(raw) {
  if (!raw) return createDefaultProgress()

  try {
    const parsed = JSON.parse(raw)
    const progress = createDefaultProgress()
    if (Array.isArray(parsed.completed)) progress.completed = parsed.completed
    if (parsed.void && typeof parsed.void === 'object') {
      progress.void = {
        started: Boolean(parsed.void.started),
        discoveredVoid0: Boolean(parsed.void.discoveredVoid0),
        completed: Boolean(parsed.void.completed),
      }
    }
    return progress
  } catch {
    return createDefaultProgress()
  }
}

export function serializeProgress(progress) {
  return JSON.stringify(progress)
}

export function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(STORAGE_KEY))
  } catch {
    return createDefaultProgress()
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProgress(progress))
  } catch {
    // Storage unavailable (private mode, blocked, etc.)
  }
}

export function isLevelUnlocked(progress, levelId) {
  const index = LEVEL_ORDER.indexOf(levelId)
  if (index === -1) return false
  if (index === 0) return true
  return progress.completed.includes(LEVEL_ORDER[index - 1])
}

export function markVoidStarted(progress) {
  progress.void.started = true
  return progress
}

export function markVoid0Discovered(progress) {
  progress.void.started = true
  progress.void.discoveredVoid0 = true
  return progress
}

export function completeVoidLevel(progress) {
  progress.void.started = true
  progress.void.discoveredVoid0 = true
  progress.void.completed = true
  if (!progress.completed.includes('void')) progress.completed.push('void')
  return progress
}

export function canSubmitVoidAnswer(progress) {
  return progress.void.started && progress.void.discoveredVoid0 && !progress.void.completed
}

export const VOID_SESSION_ENTERED = 'cyfernode-void-entered'
export const VOID_SESSION_ZERO = 'cyfernode-void-zero'

export function markVoidEnteredSession() {
  try {
    sessionStorage.setItem(VOID_SESSION_ENTERED, '1')
  } catch {
    // ignore
  }
}

export function markVoidZeroSession() {
  try {
    sessionStorage.setItem(VOID_SESSION_ZERO, '1')
  } catch {
    // ignore
  }
}

export function hasVoidZeroSession() {
  try {
    return sessionStorage.getItem(VOID_SESSION_ZERO) === '1'
  } catch {
    return false
  }
}

export function syncVoid0Arrival(progress) {
  if (!progress.void.started) return progress
  if (progress.void.discoveredVoid0) return progress
  if (hasVoidZeroSession()) return markVoid0Discovered(progress)

  try {
    if (document.referrer.includes('/prompts/clue-less-prompt/void')) {
      return markVoid0Discovered(progress)
    }
  } catch {
    // ignore
  }

  return progress
}

export function resetVoidProgress(progress) {
  progress.void = defaultVoidState()
  progress.completed = progress.completed.filter((level) => level !== 'void')
  return progress
}

export function resetAllProgress() {
  return createDefaultProgress()
}

export function getWhitespaceVerificationMessage() {
  return VOID_WHITESPACE_MESSAGE
}
