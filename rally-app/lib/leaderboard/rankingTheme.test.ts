import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: {
    select: (options: Record<string, unknown>) => options.default ?? options.ios ?? options.android ?? options.web,
  },
}))

describe('arcade arena theme contracts', () => {
  it('uses orange home arena surfaces and keeps yellow reserved for economy value', async () => {
    const { ActivityColor, RallyPalette, SportDark, SportLight } = await import('@/constants/theme')

    expect(SportLight.arenaBg).toBe('#d66538')
    expect(SportLight.arenaInk).toBe('#161616')
    expect(SportLight.panelBg).toBe('#ffffff')
    expect(SportLight.arcadePanel).toBe('#ffffff')
    expect(SportLight.fightBg).toBe('#161616')
    expect(SportLight.fightPanel).toBe('#202020')
    expect(SportLight.panelBg).not.toBe('#d1e0dd')
    expect(SportLight.panelBg).not.toBe('#d8d2c6')
    expect(SportLight.panelBg).not.toBe('#30211e')
    expect(SportLight.economy).toBe(RallyPalette.amber)
    expect(SportLight.trust).toBe(RallyPalette.green)
    expect(SportLight.risk).toBe(RallyPalette.red)

    expect(SportDark.trust).toBe(SportDark.greenVivid)
    expect(SportDark.bg).not.toBe('#1c1312')
    expect(SportDark.arcadeCta).toBe(RallyPalette.amber)
    expect(SportDark.economy).toBe(RallyPalette.amber)
    expect(SportDark.blue).toBe(RallyPalette.blue)
    expect(Object.values(SportDark)).not.toContain('#38d5ff')

    expect(ActivityColor.running).toBe(RallyPalette.lime)
    expect(ActivityColor.basketball).toBe(RallyPalette.orange)
    expect(ActivityColor.basketball).not.toBe(RallyPalette.amber)
    expect(ActivityColor.badminton).toBe(RallyPalette.teal)
  })
})

describe('ranking theme contracts', () => {
  it('uses Arcade Arena ranking colors in both modes', async () => {
    const { RallyPalette } = await import('@/constants/theme')
    const { buildRankingTheme, RANK_COLOR } = await import('./rankingTheme')

    const darkTheme = buildRankingTheme('dark', RallyPalette.orange)
    const lightTheme = buildRankingTheme('light', RallyPalette.orange)

    expect(darkTheme.bg).toBe('#161616')
    expect(darkTheme.rowBg).toBe('#202020')
    expect(lightTheme.bg).toBe('#fbfaf7')
    expect(lightTheme.ratingBoxBg).toBe('#161616')
    expect(darkTheme.podium[1].card).toBe(RallyPalette.amber)
    expect(darkTheme.podium[2].card).toBe(RallyPalette.blue)
    expect(darkTheme.podium[3].card).toBe(RallyPalette.orange)
    expect(lightTheme.podium[1].card).toBe(RallyPalette.amber)
    expect(lightTheme.podium[2].card).not.toBe(RallyPalette.amber)
    expect(lightTheme.rowYouBorder).toBe(RallyPalette.amber)
    expect(darkTheme.trophyBg).toBe('#202020')
    expect(darkTheme.tabBorderInactive).not.toContain('234,195,26')
    expect(darkTheme.rowBorder).not.toContain('234,195,26')
    expect(darkTheme.youBadgeBg).toBe(RallyPalette.orange)
    expect(lightTheme.rowYouBg).not.toBe(lightTheme.podium[1].card)
    expect(Object.values(RANK_COLOR)).not.toContain('#38d5ff')
    expect(Object.values(RANK_COLOR)).not.toContain('#d8d2c6')
  })
})
