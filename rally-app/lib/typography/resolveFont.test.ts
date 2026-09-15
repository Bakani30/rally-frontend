import { describe, expect, it } from 'vitest'

import { detectScript, resolveTypeStyle } from './resolveFont'

describe('detectScript', () => {
  it('flags strings containing Thai as th', () => {
    expect(detectScript('อันดับ')).toBe('th')
    expect(detectScript('RANKING อันดับ')).toBe('th') // mixed → th (Thai fonts carry Latin)
  })

  it('treats Latin-only and empty strings as en', () => {
    expect(detectScript('RANKING')).toBe('en')
    expect(detectScript('')).toBe('en')
    expect(detectScript('123 +45')).toBe('en')
  })
})

describe('resolveTypeStyle', () => {
  it('leaves the English heading in the display voice (no family swap)', () => {
    expect(resolveTypeStyle('head', 'en')).toEqual({ fontWeight: '900', fontStyle: 'italic' })
  })

  it('uses Prompt (italic) for Thai headings', () => {
    expect(resolveTypeStyle('head', 'th')).toEqual({
      fontFamily: 'Prompt_700Bold',
      fontStyle: 'italic',
    })
  })

  it('uses SF Pro Rounded for English body', () => {
    // ios branch of the Fonts token under the Vitest RN stub
    expect(resolveTypeStyle('body', 'en')).toEqual({ fontFamily: 'ui-rounded' })
  })

  it('uses IBM Plex Thai for Thai body', () => {
    expect(resolveTypeStyle('body', 'th')).toEqual({ fontFamily: 'IBMPlexSansThai_400Regular' })
  })
})
