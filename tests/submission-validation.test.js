import { describe, expect, it } from 'vitest'
import {
  countWords,
  detectPlatform,
  isPasskey,
  normalizeSchoolCode,
  parsePublicUrl,
  validateDeliverableEntry,
  validateFile,
  validatePlainTextWords,
} from '../src/lib/submission/validation.js'

describe('submission validation', () => {
  it('normalizes school codes from CYN00 through CYN100', () => {
    expect(normalizeSchoolCode('cyn042')).toBe('CYN42')
    expect(normalizeSchoolCode('CYN00')).toBe('CYN00')
    expect(normalizeSchoolCode('CYN100')).toBe('CYN100')
    expect(normalizeSchoolCode('CYN101')).toBeNull()
    expect(normalizeSchoolCode('ABC')).toBeNull()
    expect(isPasskey('1234')).toBe(true)
    expect(isPasskey('147')).toBe(false)
    expect(isPasskey('12ab')).toBe(false)
  })

  it('accepts public http and https links and names known hosts', () => {
    expect(parsePublicUrl('https://youtu.be/abc').ok).toBe(true)
    expect(detectPlatform('drive.google.com')).toBe('Google Drive')
    expect(parsePublicUrl('notaurl').ok).toBe(false)
    expect(parsePublicUrl('ftp://files.example.com/a').ok).toBe(false)
  })

  it('checks extension and size from the deliverable config', () => {
    const deliverable = { accepted_file_types: ['png', 'jpg'], max_file_size_mb: 20 }
    expect(validateFile({ name: 'poster.PNG', size: 1024 }, deliverable).ok).toBe(true)
    expect(validateFile({ name: 'poster.pdf', size: 1024 }, deliverable).ok).toBe(false)
    expect(validateFile({ name: 'poster.png', size: 21 * 1024 * 1024 }, deliverable).ok).toBe(false)
  })

  it('counts words only when a plain-text limit is configured', () => {
    expect(countWords('one two  three')).toBe(3)
    expect(validatePlainTextWords('one two three four', 3).ok).toBe(false)
    expect(validateDeliverableEntry(
      { name: 'Essay', type: 'file', required: true },
      { file_path: 'a/b/essay.pdf' },
    ).ok).toBe(true)
    expect(validateDeliverableEntry(
      { name: 'Video', type: 'url', required: true },
      { value: 'https://vimeo.com/1' },
    ).ok).toBe(true)
    expect(validateDeliverableEntry(
      { name: 'Website', type: 'url', required: false },
      null,
    ).ok).toBe(true)
  })
})
