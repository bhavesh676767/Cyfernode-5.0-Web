import { describe, expect, it } from 'vitest'
import { friendlyError } from '../src/lib/submission/errors.js'

describe('email system error handling', () => {
  it('formats invalid passkey message correctly', () => {
    expect(friendlyError('Invalid passkey. Please try again.')).toBe('Invalid passkey. Please try again.')
  })

  it('formats duplicate submission message correctly', () => {
    expect(friendlyError('This team has already submitted this event.')).toBe('This team has already submitted this event.')
  })

  it('formats rate limit lock message correctly', () => {
    expect(friendlyError('Too many incorrect attempts. Try again in 15 minutes.')).toBe('Too many incorrect attempts. Try again in 15 minutes.')
  })
})
