import { describe, expect, it } from 'vitest'
import { getTitleFrameStyle, hasTitleFrame } from './titleFrameRegistry'

describe('titleFrameRegistry', () => {
  it('returns the cyberpunk style for the beta tester title', () => {
    const style = getTitleFrameStyle('title_beta_tester')
    expect(style).toEqual({
      kind: 'cyberpunk',
      accentColor: '#FF1F3D',
      glitchIntensity: 0.85,
    })
    expect(hasTitleFrame('title_beta_tester')).toBe(true)
  })

  it('returns null for plain titles and missing codes', () => {
    expect(getTitleFrameStyle('title_rookie')).toBeNull()
    expect(getTitleFrameStyle(null)).toBeNull()
    expect(getTitleFrameStyle(undefined)).toBeNull()
    expect(hasTitleFrame('title_rookie')).toBe(false)
    expect(hasTitleFrame(null)).toBe(false)
  })
})
