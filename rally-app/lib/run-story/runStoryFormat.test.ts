import { describe, expect, it } from 'vitest'

import {
  formatStoryDistance,
  formatStoryDuration,
  formatStoryPace,
} from './runStoryFormat'

describe('run story formatters', () => {
  it('formats distance like the run summary', () => {
    expect(formatStoryDistance(1094)).toBe('1.09 km')
    expect(formatStoryDistance(null)).toBe('--')
  })

  it('formats moving time', () => {
    expect(formatStoryDuration(862)).toBe('14:22')
    expect(formatStoryDuration(3661)).toBe('1:01:01')
  })

  it('formats pace', () => {
    expect(formatStoryPace(787)).toBe('13:07/km')
  })
})
