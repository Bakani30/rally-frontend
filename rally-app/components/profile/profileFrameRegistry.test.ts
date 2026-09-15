import { describe, it, expect, vi } from 'vitest'

// rankAssets.ts (pulled in by the registry to resolve rank icons) statically
// imports the tier icon PNGs. Vitest's node env can't parse .png binaries, so
// each icon asset needs a stand-in. The specifier must match the literal path
// used in rankAssets.ts (`../../assets/ranks/...`), not this test's own location
// — vi.mock matching is specifier-literal. The frame rings are inline SVG now,
// so no frame PNGs need mocking.
vi.mock('../../assets/ranks/rank-1-bronze.png', () => ({ default: 1 }))
vi.mock('../../assets/ranks/rank-2-silver.png', () => ({ default: 2 }))
vi.mock('../../assets/ranks/rank-3-gold.png', () => ({ default: 3 }))
vi.mock('../../assets/ranks/rank-4-platinum.png', () => ({ default: 4 }))
vi.mock('../../assets/ranks/rank-5-diamond.png', () => ({ default: 5 }))
vi.mock('../../assets/ranks/rank-6-immortal.png', () => ({ default: 6 }))
vi.mock('../../assets/ranks/rank-7-challenger.png', () => ({ default: 7 }))

import { getProfileFrameDefinition, isDefaultProfileFrame } from './profileFrameRegistry'
import { getRankFrameSvg } from '@/lib/ranks/rankFrameSvg'
import { TIER_THRESHOLDS } from '@/lib/leaderboard/tierRules'

describe('getProfileFrameDefinition — rank frames', () => {
  it('renders the tier ring as an avatar-fitted SVG layer above the avatar for every tier', () => {
    for (const { tier } of TIER_THRESHOLDS) {
      const def = getProfileFrameDefinition(`rank_frame_${tier}`)
      expect(def.assetRefs).toContain(`rank_frame_${tier}`)
      const svgLayer = def.layers.find((l) => l.svgXml !== undefined)
      expect(svgLayer).toBeDefined()
      expect(svgLayer?.svgXml).toBe(getRankFrameSvg(tier))
      expect(svgLayer?.fitInnerToAvatar).toBe(true)
      expect(svgLayer?.aboveAvatar).toBe(true)
    }
  })

  it('rank_frame_gold carries the gold ring SVG specifically', () => {
    const def = getProfileFrameDefinition('rank_frame_gold')
    expect(def.layers[0]?.svgXml).toBe(getRankFrameSvg('gold'))
  })

  it('is NOT treated as the default/no-frame ring', () => {
    expect(isDefaultProfileFrame('rank_frame_gold')).toBe(false)
    for (const { tier } of TIER_THRESHOLDS) {
      expect(isDefaultProfileFrame(`rank_frame_${tier}`)).toBe(false)
    }
  })

  it('falls through to default for null, unknown tier, or unrelated code', () => {
    expect(isDefaultProfileFrame(null)).toBe(true)
    expect(isDefaultProfileFrame('rank_frame_wood')).toBe(true)
    expect(isDefaultProfileFrame('rank_frame_')).toBe(true)
    expect(isDefaultProfileFrame('frame_rookie')).toBe(true)
  })
})
