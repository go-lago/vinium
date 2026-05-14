import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelative } from './format'

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

describe('formatRelative', () => {
  it('returns "только что" for < 1 minute ago', () => {
    expect(formatRelative(ago(30_000))).toBe('только что')
  })

  it('returns minutes for < 1 hour ago', () => {
    expect(formatRelative(ago(5 * 60_000))).toBe('5м')
    expect(formatRelative(ago(59 * 60_000))).toBe('59м')
  })

  it('returns hours for < 24 hours ago', () => {
    expect(formatRelative(ago(2 * 3600_000))).toBe('2ч')
    expect(formatRelative(ago(23 * 3600_000))).toBe('23ч')
  })

  it('returns days for < 7 days ago', () => {
    expect(formatRelative(ago(3 * 86400_000))).toBe('3д')
    expect(formatRelative(ago(6 * 86400_000))).toBe('6д')
  })

  it('returns locale date string for >= 7 days ago', () => {
    const result = formatRelative(ago(10 * 86400_000))
    // Should be a date string, not a relative label
    expect(result).not.toMatch(/^(только что|\d+[мчд])$/)
    expect(result.length).toBeGreaterThan(0)
  })
})
