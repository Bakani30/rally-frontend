import { describe, expect, it } from 'vitest'
import { formatWatermarkTimestamp } from './watermarkTimestamp'

describe('formatWatermarkTimestamp', () => {
  it('formats as DD/MM HH:mm with zero-padding', () => {
    // 2026-07-04, 09:07 local
    expect(formatWatermarkTimestamp(new Date(2026, 6, 4, 9, 7))).toBe('04/07 09:07')
  })

  it('keeps two digits for double-digit day/month/time', () => {
    // 2026-12-25, 23:59 local
    expect(formatWatermarkTimestamp(new Date(2026, 11, 25, 23, 59))).toBe('25/12 23:59')
  })

  it('pads midnight to 00:00', () => {
    expect(formatWatermarkTimestamp(new Date(2026, 0, 1, 0, 0))).toBe('01/01 00:00')
  })
})
