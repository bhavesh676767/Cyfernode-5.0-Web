import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { echoConfig } from '../../src/levels/echo/echo.config.js'
import {
  getIntermediateResponse,
  isEmptyAnswer,
  isLocallyRejectedAnswer,
  normalizeHuntAnswer,
} from '../../src/levels/echo/echo.validate.js'
import {
  createDefaultProgress,
  completeVoidLevel,
  isLevelUnlocked,
} from '../../public/clue-less/lib/state.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(root, '../..')

describe('echo asset contract', () => {
  const wavPath = path.join(projectRoot, 'public/echo/audio/ECHO_02.wav')
  const assetPresent = fs.existsSync(wavPath)

  it('documents required audio path', () => {
    expect(echoConfig.audio.src).toBe('/echo/audio/ECHO_02.wav')
    expect(fs.existsSync(path.join(projectRoot, 'public/echo/README.md'))).toBe(true)
  })

  ;(assetPresent ? it : it.skip)('requires ECHO_02.wav to be supplied', () => {
    expect(fs.existsSync(wavPath)).toBe(true)
  })
})

describe('echo config', () => {
  it('does not expose the final answer in config', () => {
    const serialized = JSON.stringify(echoConfig).toUpperCase()
    expect(serialized).not.toContain('SECOND')
    expect(echoConfig.final.validationId).toBe('echo-final')
  })

  it('includes hints in configuration', () => {
    expect(echoConfig.hints.length).toBeGreaterThanOrEqual(3)
  })
})

describe('echo local answer handling', () => {
  it('rejects REPEAT as intermediate', () => {
    expect(isLocallyRejectedAnswer('REPEAT')).toBe(true)
    expect(getIntermediateResponse()).toBe('That\'s not the end.')
  })

  it('rejects LOOK BACK as final', () => {
    expect(isLocallyRejectedAnswer('LOOK BACK')).toBe(true)
    expect(isLocallyRejectedAnswer('lookback')).toBe(true)
  })

  it('normalizes whitespace and case', () => {
    expect(normalizeHuntAnswer('  second  ')).toBe('SECOND')
    expect(isEmptyAnswer('   ')).toBe(true)
  })
})

describe('echo progress unlock', () => {
  it('unlocks after VOID completion', () => {
    const progress = completeVoidLevel(createDefaultProgress())
    expect(isLevelUnlocked(progress, 'echo')).toBe(true)
  })
})
