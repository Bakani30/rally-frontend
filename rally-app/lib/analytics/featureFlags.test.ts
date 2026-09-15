import { describe, expect, it } from 'vitest'
import { parseDefaultStakeAmount } from './featureFlags'

describe('parseDefaultStakeAmount', () => {
  it('accepts the only supported experiment variants', () => {
    expect(parseDefaultStakeAmount(50)).toBe(50)
    expect(parseDefaultStakeAmount('50')).toBe(50)
    expect(parseDefaultStakeAmount(100)).toBe(100)
    expect(parseDefaultStakeAmount('100')).toBe(100)
  })

  it('falls back to 50 for unavailable or unsupported flag values', () => {
    expect(parseDefaultStakeAmount(undefined)).toBe(50)
    expect(parseDefaultStakeAmount(false)).toBe(50)
    expect(parseDefaultStakeAmount('200')).toBe(50)
  })
})
