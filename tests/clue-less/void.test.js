import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  encodeWhitespaceMessage,
  decodeWhitespaceMessage,
  extractWhitespacePayloadFromHtml,
  VOID_WHITESPACE_MESSAGE,
} from '../../public/clue-less/lib/whitespace.js'
import {
  checkVoidAnswer,
  isRejectedObviousGuess,
  VOID_TIMESTAMP,
} from '../../public/clue-less/lib/puzzle.js'
import {
  createDefaultProgress,
  markVoidStarted,
  markVoid0Discovered,
  completeVoidLevel,
  canSubmitVoidAnswer,
  isLevelUnlocked,
  resetVoidProgress,
} from '../../public/clue-less/lib/state.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(root, '../..')
const voidHtml = fs.readFileSync(path.join(projectRoot, 'public/prompts/clue-less-prompt/void/index.html'), 'utf8')
const voidZeroHtml = fs.readFileSync(path.join(projectRoot, 'public/prompts/clue-less-prompt/void/0/index.html'), 'utf8')

describe('whitespace puzzle', () => {
  it('encodes and decodes THE VOID IS NOT EMPTY', () => {
    const encoded = encodeWhitespaceMessage(VOID_WHITESPACE_MESSAGE)
    expect(decodeWhitespaceMessage(encoded)).toBe(VOID_WHITESPACE_MESSAGE)
  })

  it('extracts encoded payload from void HTML source', () => {
    const payload = extractWhitespacePayloadFromHtml(voidHtml)
    expect(payload.length).toBeGreaterThan(100)
    expect(decodeWhitespaceMessage(payload)).toBe(VOID_WHITESPACE_MESSAGE)
  })
})

describe('answer validation', () => {
  it('accepts NOTHING with any casing and surrounding whitespace', () => {
    expect(checkVoidAnswer('NOTHING').ok).toBe(true)
    expect(checkVoidAnswer('nothing').ok).toBe(true)
    expect(checkVoidAnswer('  Nothing  ').ok).toBe(true)
  })

  it('rejects empty submissions', () => {
    expect(checkVoidAnswer('').reason).toBe('empty')
    expect(checkVoidAnswer('   ').reason).toBe('empty')
  })

  it('rejects obvious guesses', () => {
    for (const guess of ['VOID', 'EMPTY', 'ZERO', 'NOT', 'void', 'mirror']) {
      expect(checkVoidAnswer(guess).ok).toBe(false)
      if (['VOID', 'EMPTY', 'ZERO', 'NOT'].includes(guess.toUpperCase())) {
        expect(isRejectedObviousGuess(guess)).toBe(true)
      }
    }
  })
})

describe('void state progression', () => {
  it('tracks started, discoveredVoid0, and completed', () => {
    let progress = createDefaultProgress()
    expect(canSubmitVoidAnswer(progress)).toBe(false)

    progress = markVoidStarted(progress)
    expect(progress.void.started).toBe(true)
    expect(canSubmitVoidAnswer(progress)).toBe(false)

    progress = markVoid0Discovered(progress)
    expect(progress.void.discoveredVoid0).toBe(true)
    expect(canSubmitVoidAnswer(progress)).toBe(true)

    progress = completeVoidLevel(progress)
    expect(progress.void.completed).toBe(true)
    expect(progress.completed).toContain('void')
    expect(canSubmitVoidAnswer(progress)).toBe(false)
    expect(isLevelUnlocked(progress, 'echo')).toBe(true)
  })

  it('reset removes void completion', () => {
    let progress = completeVoidLevel(createDefaultProgress())
    progress = resetVoidProgress(progress)
    expect(progress.completed).not.toContain('void')
    expect(progress.void.completed).toBe(false)
  })
})

describe('hidden clues in HTML', () => {
  it('includes the source comment on /void', () => {
    expect(voidHtml).toContain('You are looking for something.')
    expect(voidHtml).toContain('That\'s your first mistake.')
    expect(voidHtml).toContain('01110110 01101111 01101001 01100100')
  })

  it('includes the 404 flow and zero link', () => {
    expect(voidHtml).toContain('404 - NOTHING FOUND')
    expect(voidHtml).toContain('href="/prompts/clue-less-prompt/void/0"')
    expect(voidHtml).toContain('0</a> users found what they were looking for.')
  })

  it('includes timestamp-linked hidden layer on /void/0', () => {
    expect(voidZeroHtml).toContain(`<!-- ${VOID_TIMESTAMP} -->`)
    expect(voidZeroHtml).toContain('display:none')
    expect(voidZeroHtml).toContain('19 9 18 18 9 14 7')
    expect(voidZeroHtml).toContain('id="nothing"')
    expect(voidZeroHtml).toContain('top: 22px')
    expect(voidZeroHtml).toContain('id="answer-form" hidden')
    expect(voidZeroHtml).toContain('id="last-visitor-time"')
    expect(voidZeroHtml).toContain(VOID_TIMESTAMP)
  })

  it('does not expose the final answer in visible UI copy', () => {
    const visibleVoid = voidHtml.replace(/<!--[\s\S]*?-->/g, '')
    const visibleZero = voidZeroHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    expect(visibleVoid.toUpperCase()).not.toContain('SUBMIT NOTHING')
    expect(visibleZero.toUpperCase()).not.toMatch(/ANSWER.{0,20}NOTHING/)
  })
})
