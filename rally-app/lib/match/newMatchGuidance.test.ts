import { describe, expect, it } from 'vitest'

import { getNewMatchGuidanceCopy } from './newMatchGuidance'

describe('new match guidance copy', () => {
  it('keeps start match guidance compact and visual-first', () => {
    const copy = getNewMatchGuidanceCopy()
    const strings = Object.values(copy)
      .flat()
      .filter((value): value is string => typeof value === 'string')

    expect(copy.heroTitle).toBe('START MATCH')
    expect(copy.ctaLabel).toBe('OPEN ROOM')
    expect(copy.setupSteps).toEqual(['sport', 'opponent', 'stake', 'confirm'])
    expect(strings.every((value) => value.length <= 16)).toBe(true)
    expect(strings.join(' ')).not.toMatch(/proof|video|หลักฐาน|อ่าน|เลือก.+ก่อน|ยืนยันผล/i)
  })
})
