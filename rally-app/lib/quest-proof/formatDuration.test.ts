import { describe, expect, it } from 'vitest'
import { formatMmss } from './formatDuration'

describe('formatMmss', () => {
  it('formats sub-minute durations with zero-padded minutes and seconds', () => {
    expect(formatMmss(0)).toBe('00:00')
    expect(formatMmss(5)).toBe('00:05')
    expect(formatMmss(59)).toBe('00:59')
  })

  it('rolls over into minutes', () => {
    expect(formatMmss(60)).toBe('01:00')
    expect(formatMmss(90)).toBe('01:30')
    expect(formatMmss(725)).toBe('12:05')
  })

  it('clamps negative input to 00:00', () => {
    expect(formatMmss(-5)).toBe('00:00')
  })

  it('floors fractional seconds', () => {
    expect(formatMmss(90.9)).toBe('01:30')
  })
})
