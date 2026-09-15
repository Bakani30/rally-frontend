import { describe, it, expect, vi } from 'vitest'

// Vitest (Node environment) can't load real .png binaries through a static
// `import`; Metro handles that at build time, but the unit test needs a
// stand-in per asset path so rankAssets.ts can be exercised without a device
// harness. Each mock must match the exact specifier used in rankAssets.ts.
// WARNING: vi.mock matching is specifier-literal — moving rankAssets.ts or
// renaming an asset silently bypasses these mocks and fails as a binary parse.
vi.mock('../../assets/ranks/rank-1-bronze.png', () => ({ default: 1 }))
vi.mock('../../assets/ranks/rank-2-silver.png', () => ({ default: 2 }))
vi.mock('../../assets/ranks/rank-3-gold.png', () => ({ default: 3 }))
vi.mock('../../assets/ranks/rank-4-platinum.png', () => ({ default: 4 }))
vi.mock('../../assets/ranks/rank-5-diamond.png', () => ({ default: 5 }))
vi.mock('../../assets/ranks/rank-6-immortal.png', () => ({ default: 6 }))
vi.mock('../../assets/ranks/rank-7-challenger.png', () => ({ default: 7 }))

import { getRankIcon, RANK_FRAME_CODE_BY_TIER } from './rankAssets'
import { TIER_THRESHOLDS } from '../leaderboard/tierRules'

describe('rankAssets', () => {
  it('has icon + frame code for every tier', () => {
    for (const { tier } of TIER_THRESHOLDS) {
      expect(getRankIcon(tier)).toBeTruthy()
      expect(RANK_FRAME_CODE_BY_TIER[tier]).toBe(`rank_frame_${tier}`)
    }
  })

  it('unknown activity falls back to default set, not undefined', () => {
    expect(getRankIcon('gold', 'chess-boxing')).toEqual(getRankIcon('gold'))
  })
})
