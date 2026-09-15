import { describe, expect, it } from 'vitest'
import { TierChipBg, TierColorOnChip } from '@/constants/theme'

// WCAG relative luminance / contrast ratio — same math as constants/theme.ts
// onAccent(), reimplemented here to keep this test self-contained.
function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '')
  const chan = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = chan(parseInt(c.slice(0, 2), 16))
  const g = chan(parseInt(c.slice(2, 4), 16))
  const b = chan(parseInt(c.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

// Rank Identity v1 fix: TierBadge paints icon/label in TierColorOnChip on the
// fixed TierChipBg backing (never a bare tier hue on a theme-flipping
// surface). This must hold for every tier, on the fixed chip, regardless of
// light/dark mode or the surface underneath (incl. the amber podium#1 card).
describe('TierColorOnChip on TierChipBg', () => {
  const tiers = Object.keys(TierColorOnChip)

  it('covers every tier', () => {
    expect(tiers.sort()).toEqual(
      ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'immortal', 'challenger'].sort(),
    )
  })

  it.each(tiers)('%s clears icon contrast (>=3:1) against the fixed chip', (tier) => {
    const ratio = contrastRatio(TierColorOnChip[tier], TierChipBg)
    expect(ratio).toBeGreaterThanOrEqual(3)
  })

  // silver/gold/challenger were the reported illegible-on-light-surface tiers;
  // confirm they clear the stricter text-contrast bar (>=4.5:1) on the chip.
  it.each(['silver', 'gold', 'challenger'])('%s clears label contrast (>=4.5:1) against the fixed chip', (tier) => {
    const ratio = contrastRatio(TierColorOnChip[tier], TierChipBg)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  // diamond/immortal use brightened "Vivid" variants instead of the raw
  // TierColor hex, because the raw hex (dark green/red) doesn't clear label
  // contrast on the dark chip.
  it.each(['diamond', 'immortal'])('%s clears label contrast (>=4.5:1) against the fixed chip', (tier) => {
    const ratio = contrastRatio(TierColorOnChip[tier], TierChipBg)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('bronze and platinum do not regress below icon contrast (>=3:1)', () => {
    expect(contrastRatio(TierColorOnChip.bronze, TierChipBg)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(TierColorOnChip.platinum, TierChipBg)).toBeGreaterThanOrEqual(3)
  })
})
