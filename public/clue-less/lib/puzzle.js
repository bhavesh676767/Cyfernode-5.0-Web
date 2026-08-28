export const VOID_TIMESTAMP = '23:17:04'

export function normalizeAnswer(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function checkVoidAnswer(value) {
  const normalized = normalizeAnswer(value)
  if (!normalized) return { ok: false, reason: 'empty' }
  if (normalized === 'NOTHING') return { ok: true, reason: 'correct' }
  return { ok: false, reason: 'incorrect' }
}

export const VOID_REJECTED_GUESSES = ['VOID', 'EMPTY', 'ZERO', 'NOT']

export function isRejectedObviousGuess(value) {
  return VOID_REJECTED_GUESSES.includes(normalizeAnswer(value))
}

export const VOID_HINTS = [
  'Empty doesn\'t always mean empty.',
  'What you see isn\'t everything the page contains.',
  'Look beyond the rendered page.',
]

export const VOID_SOLUTION_STEPS = [
  'Player enters VOID.',
  'The screen appears empty.',
  'Player investigates the page.',
  'Source reveals the hidden comment.',
  'Whitespace contains encoded information.',
  'Decoding gives: THE VOID IS NOT EMPTY',
  'Player notices the subtle "0 users..." element.',
  '0 leads to /prompts/clue-less-prompt/void/0.',
  '/prompts/clue-less-prompt/void/0 contains additional hidden information.',
  'Repeated concepts establish: zero / absence / empty / void',
  'Final answer: NOTHING',
]
