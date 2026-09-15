import { describe, it, expect } from 'vitest'
import { formatThaiShortDate, tierDisplayLabel } from './rankHistoryFormat'

describe('formatThaiShortDate', () => {
  it('formats an ISO date as "D <thai-month>"', () => {
    // 2026-07-02 => 2 ก.ค. (July = index 6)
    expect(formatThaiShortDate('2026-07-02T10:00:00Z')).toMatch(/^\d+ ก\.ค\.$/)
  })

  it('returns empty string on invalid input', () => {
    expect(formatThaiShortDate('not-a-date')).toBe('')
  })
})

describe('tierDisplayLabel', () => {
  it('uppercases tier names', () => {
    expect(tierDisplayLabel('platinum')).toBe('PLATINUM')
    expect(tierDisplayLabel('challenger')).toBe('CHALLENGER')
  })
})
