import { describe, expect, it } from 'vitest'
import {
  createDefaultProgress,
  markVoidStarted,
  markVoid0Discovered,
  completeVoidLevel,
  isLevelUnlocked,
  canSubmitVoidAnswer,
} from '../../public/clue-less/lib/state.js'
import { checkVoidAnswer } from '../../public/clue-less/lib/puzzle.js'

const personas = [
  {
    name: 'A — technical player',
    steps: ['enter', 'view-source', 'decode-whitespace', 'find-zero-link', 'void-0', 'submit-nothing'],
  },
  {
    name: 'B — casual browser',
    steps: ['enter', 'notice-footer-zero', 'void-0', 'submit-nothing'],
  },
  {
    name: 'C — puzzle enthusiast',
    steps: ['enter', 'view-source', 'decode-whitespace', 'decode-binary-dead-end', 'find-zero-link', 'void-0', 'submit-nothing'],
  },
  {
    name: 'D — no immediate source inspection',
    steps: ['enter', 'stare-at-404', 'eventually-footer-zero', 'void-0', 'submit-nothing'],
  },
  {
    name: 'E — brute-force guesses',
    steps: ['enter', 'void-0', 'guess-void', 'guess-empty', 'guess-zero', 'submit-nothing'],
  },
]

function simulate(steps) {
  let progress = createDefaultProgress()
  let lastError = ''

  for (const step of steps) {
    if (step === 'enter') progress = markVoidStarted(progress)
    if (step === 'view-source' || step === 'decode-whitespace' || step === 'decode-binary-dead-end' || step === 'stare-at-404') continue
    if (
      step === 'notice-footer-zero'
      || step === 'find-zero-link'
      || step === 'eventually-footer-zero'
      || step === 'void-0'
      || step === 'void-0-direct'
    ) {
      progress = markVoid0Discovered(progress)
    }
    if (step === 'guess-void') lastError = checkVoidAnswer('VOID').ok ? '' : 'incorrect'
    if (step === 'guess-empty') lastError = checkVoidAnswer('EMPTY').ok ? '' : 'incorrect'
    if (step === 'guess-zero') lastError = checkVoidAnswer('ZERO').ok ? '' : 'incorrect'
    if (step === 'submit-nothing') {
      const result = checkVoidAnswer('NOTHING')
      if (!result.ok) lastError = result.reason
      else if (canSubmitVoidAnswer(progress)) progress = completeVoidLevel(progress)
      else lastError = 'blocked-before-final-state'
    }
  }

  return { progress, lastError }
}

describe('fresh-player playthrough simulations', () => {
  for (const persona of personas) {
    it(`${persona.name} can complete VOID logically`, () => {
      const { progress, lastError } = simulate(persona.steps)
      expect(progress.void.completed).toBe(true)
      expect(progress.completed).toContain('void')
      expect(isLevelUnlocked(progress, 'echo')).toBe(true)
      expect(lastError).not.toBe('blocked-before-final-state')
    })
  }

  it('blocks submission before reaching void/0', () => {
    const progress = markVoidStarted(createDefaultProgress())
    expect(canSubmitVoidAnswer(progress)).toBe(false)
    expect(checkVoidAnswer('NOTHING').ok).toBe(true)
  })
})
