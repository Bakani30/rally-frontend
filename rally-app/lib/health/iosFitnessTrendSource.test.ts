import { describe, expect, it } from 'vitest'

import { normalizeSpo2Percent } from './iosFitnessTrendSource'

describe('normalizeSpo2Percent', () => {
  it('scales a 0-1 fraction up to a 0-100 percent', () => {
    expect(normalizeSpo2Percent(0.98)).toBe(98)
  })

  it('leaves an already-percent value unchanged', () => {
    expect(normalizeSpo2Percent(98)).toBe(98)
  })

  it('treats exactly 1 as a fraction (100%), not 1%', () => {
    expect(normalizeSpo2Percent(1)).toBe(100)
  })
})
