import { describe, expect, it } from 'vitest'
import { formatCountdown, formatStartsIn, isEndingSoon } from './challengeFormat'

const NOW = Date.parse('2026-06-20T00:00:00Z')
const inHours = (h: number) => new Date(NOW + h * 3600 * 1000).toISOString()

describe('formatCountdown', () => {
  it('formats remaining days, hours, sub-hour, and expiry', () => {
    expect(formatCountdown(inHours(72), NOW)).toBe('เหลือ 3 วัน')
    expect(formatCountdown(inHours(5), NOW)).toBe('เหลือ 5 ชม.')
    expect(formatCountdown(inHours(0.5), NOW)).toBe('เหลือ < 1 ชม.')
    expect(formatCountdown(inHours(-1), NOW)).toBe('หมดเวลา')
  })

  it('handles exact thresholds', () => {
    expect(formatCountdown(inHours(1), NOW)).toBe('เหลือ 1 ชม.')
    expect(formatCountdown(inHours(24), NOW)).toBe('เหลือ 1 วัน')
  })
})

describe('isEndingSoon', () => {
  it('is true within 24h and still live, false otherwise', () => {
    expect(isEndingSoon(inHours(10), NOW)).toBe(true)
    expect(isEndingSoon(inHours(48), NOW)).toBe(false)
    expect(isEndingSoon(inHours(-1), NOW)).toBe(false)
    expect(isEndingSoon(inHours(24), NOW)).toBe(true)
  })
})

describe('formatStartsIn', () => {
  it('formats upcoming start windows', () => {
    expect(formatStartsIn(inHours(48), NOW)).toBe('เริ่มใน 2 วัน')
    expect(formatStartsIn(inHours(3), NOW)).toBe('เริ่มวันนี้')
    expect(formatStartsIn(inHours(-1), NOW)).toBe('เริ่มแล้ว')
    expect(formatStartsIn(inHours(24), NOW)).toBe('เริ่มใน 1 วัน')
  })
})
