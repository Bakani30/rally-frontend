import { describe, expect, it } from 'vitest'

import { HOME_SHORTCUTS, REWARDS_TAB_ITEM } from './homeMenu'
import { SHORTCUT_ICON_SVGS } from './shortcutIcons'

describe('home menu navigation', () => {
  it('puts Rewards in the bottom tab slot that opens redeem rewards', () => {
    expect(REWARDS_TAB_ITEM).toMatchObject({
      routeName: 'redeem',
      label: 'Rewards',
      icon: 'gift-outline',
    })
  })

  it('keeps the compact New Home shortcut order', () => {
    expect(HOME_SHORTCUTS.map((shortcut) => shortcut.key)).toEqual([
      'lobby',
      'quest',
      'event',
      'referee',
    ])
  })

  it('drops Guild, Community, History, and Cosmetics from the Home rail', () => {
    const keys = HOME_SHORTCUTS.map((shortcut) => shortcut.key)
    expect(keys).not.toContain('guild')
    expect(keys).not.toContain('community')
    expect(keys).not.toContain('history')
    expect(keys).not.toContain('cosmetics')
  })

  it('keeps Academy out of the Home shortcut rail for now', () => {
    expect(HOME_SHORTCUTS.map((shortcut) => shortcut.key)).not.toContain('academy')
  })

  it('points Quest at the Quest Hub', () => {
    expect(HOME_SHORTCUTS.find((shortcut) => shortcut.key === 'quest')).toMatchObject({
      label: 'Quest',
      route: '/quests',
    })
  })

  it('points Event at the Campaigns hub', () => {
    expect(HOME_SHORTCUTS.find((shortcut) => shortcut.key === 'event')).toMatchObject({
      label: 'Event',
      route: '/campaigns',
    })
  })

  it('gives every tile an English heading and a Thai subtitle', () => {
    const thai = /[฀-๿]/
    for (const shortcut of HOME_SHORTCUTS) {
      expect(shortcut.label, `${shortcut.key} label should be English`).not.toMatch(thai)
      expect(shortcut.subtitle, `${shortcut.key} subtitle should be Thai`).toMatch(thai)
    }
  })

  it('does not give Lobby an SVG mark (it is image-backed by the Colosseum brand mark)', () => {
    expect(SHORTCUT_ICON_SVGS.lobby).toBeUndefined()
  })

  it('keeps bespoke SVG marks for Event and Quest; Referee falls back to a glyph', () => {
    expect(Object.keys(SHORTCUT_ICON_SVGS).sort()).toEqual(['event', 'quest'])
    expect(SHORTCUT_ICON_SVGS.referee).toBeUndefined()
    for (const svg of Object.values(SHORTCUT_ICON_SVGS)) {
      expect(svg).toContain('<svg')
    }
  })
})
