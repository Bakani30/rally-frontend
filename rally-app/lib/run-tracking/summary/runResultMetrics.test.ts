import { describe, expect, it } from 'vitest'

import { formatRunResultDateTime } from './runResultMetrics'

describe('formatRunResultDateTime', () => {
  it('does not throw and returns a non-empty string', () => {
    const result = formatRunResultDateTime('2026-05-11T17:38:00.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes a separator between date and time parts', () => {
    const result = formatRunResultDateTime('2026-05-11T17:38:00.000Z')
    expect(result).toContain('·')
  })

  it('falls back gracefully on an invalid date string without throwing', () => {
    expect(() => formatRunResultDateTime('not-a-date')).not.toThrow()
  })
})
