import { describe, expect, it } from 'vitest'

import {
  SPORT_REEL_ITEMS,
  SPORT_REEL_COLORS,
  getNextSportReelKey,
  getSportReelItem,
  getSportReelWindow,
  resolveStoredSportReelKey,
} from './sportReel'

describe('sport reel selector', () => {
  it('keeps MVP sports enabled and future sports locked', () => {
    expect(SPORT_REEL_ITEMS.slice(0, 3).map((item) => [item.key, item.isEnabled])).toEqual([
      ['running', true],
      ['basketball', true],
      ['badminton', true],
    ])
    expect(SPORT_REEL_ITEMS.slice(3).map((item) => [item.key, item.isEnabled])).toEqual([
      ['volleyball', false],
      ['tennis', false],
      ['golf', false],
      ['boxing', false],
    ])
  })

  it('keeps basketball on a softer terracotta arena theme', () => {
    const basketball = getSportReelItem('basketball')
    expect(basketball.background).toBe('#d96a43')
    expect(basketball.background).toBe(SPORT_REEL_COLORS.basketball)
    expect(basketball.accent).toBe(SPORT_REEL_COLORS.basketballAccent)
    expect(basketball.cardBorder).toBe('#dc8a62')
  })

  it('keeps running distinct from basketball with a night lime theme', () => {
    const running = getSportReelItem('running')
    expect(running.background).toBe('#32372d')
    expect(running.accent).toBe(SPORT_REEL_COLORS.runningAccent)
    expect(running.cardBorder).toBe(SPORT_REEL_COLORS.runningAccent)
    expect(running.screenText).toBe('#f9f6f0')
    expect(running.background).not.toBe(getSportReelItem('basketball').background)
    expect(running.accent).not.toBe(running.background)
  })

  it('applies the blue-green treatment to badminton', () => {
    const badminton = getSportReelItem('badminton')
    expect(badminton.background).toBe('#1f6456')
    expect(badminton.accent).toBe(SPORT_REEL_COLORS.badmintonAccent)
    expect(badminton.cardBorder).toBe(SPORT_REEL_COLORS.badmintonAccent)
    expect(badminton.cardBackground).toBe('#0f3b32')
  })

  it('gives each enabled sport a distinct card and border treatment', () => {
    const enabledSports = SPORT_REEL_ITEMS.filter((item) => item.isEnabled)
    expect(new Set(enabledSports.map((item) => item.cardBackground)).size).toBe(enabledSports.length)
    expect(new Set(enabledSports.map((item) => item.cardBorder)).size).toBe(enabledSports.length)
  })

  it('moves through the reel one slot at a time and wraps around', () => {
    expect(getNextSportReelKey('running', 1)).toBe('basketball')
    expect(getNextSportReelKey('running', -1)).toBe('boxing')
    expect(getNextSportReelKey('boxing', 1)).toBe('running')
  })

  it('centers the selected sport in the visible reel window', () => {
    const window = getSportReelWindow('badminton')
    expect(window.map((item) => item.key)).toEqual([
      'running',
      'basketball',
      'badminton',
      'volleyball',
      'tennis',
    ])
    expect(window[2]).toBe(getSportReelItem('badminton'))
  })

  it('restores the last selected slot, including locked future sports', () => {
    expect(resolveStoredSportReelKey('tennis')).toBe('tennis')
    expect(resolveStoredSportReelKey('made-up')).toBe('running')
    expect(resolveStoredSportReelKey(null)).toBe('running')
  })
})
