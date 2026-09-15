import { describe, expect, it } from 'vitest'
import {
  parseNullableBasketballStatInput,
  setNullableBasketballStat,
  stepNullableBasketballStat,
} from './basketballNullableStatInput'

describe('nullable basketball stat input', () => {
  it('keeps unknown, explicit zero, and positive values distinct', () => {
    expect(parseNullableBasketballStatInput('', 4)).toBeNull()
    expect(parseNullableBasketballStatInput('0', null)).toBe(0)
    expect(parseNullableBasketballStatInput('12', null)).toBe(12)
  })

  it('ignores invalid and negative keyboard input', () => {
    expect(parseNullableBasketballStatInput('abc', 4)).toBe(4)
    expect(parseNullableBasketballStatInput('-1', 4)).toBe(4)
  })

  it('uses plus to begin a known count and leaves unknown minus unchanged', () => {
    expect(stepNullableBasketballStat(null, 1)).toBe(1)
    expect(stepNullableBasketballStat(null, -1)).toBeNull()
  })

  it('clamps stepper values to the supported range', () => {
    expect(stepNullableBasketballStat(0, -1)).toBe(0)
    expect(stepNullableBasketballStat(200, 1)).toBe(200)
    expect(parseNullableBasketballStatInput('999', null)).toBe(200)
  })

  it('omits unknown keys while preserving an explicit zero', () => {
    const withZero = setNullableBasketballStat({}, 'points', 0)
    const withoutRebounds = setNullableBasketballStat({ ...withZero, rebounds: 4 }, 'rebounds', null)

    expect(withoutRebounds).toEqual({ points: 0 })
    expect(JSON.parse(JSON.stringify(withoutRebounds))).toEqual({ points: 0 })
  })
})
