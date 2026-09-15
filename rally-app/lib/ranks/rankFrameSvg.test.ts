import { describe, it, expect } from 'vitest'
import {
  RANK_FRAME_INNER,
  RANK_FRAME_VIEWBOX,
  RANK_FRAME_OVERLAP,
  RANK_FRAME_SVG_BY_TIER,
  computeRankFrameLayerSize,
  getRankFrameSvg,
} from './rankFrameSvg'
import { TIER_THRESHOLDS } from '../leaderboard/tierRules'

describe('rankFrameSvg', () => {
  it('has normalized ring markup for every tier', () => {
    for (const { tier } of TIER_THRESHOLDS) {
      const svg = getRankFrameSvg(tier)
      expect(svg).toBe(RANK_FRAME_SVG_BY_TIER[tier])
      // Square, ring-centered viewBox — the geometry the size math assumes.
      expect(svg).toContain('viewBox="-8 -8 216 216"')
      // Drop-shadow filter stripped (partial react-native-svg support).
      expect(svg).not.toContain('feDropShadow')
      expect(svg).not.toContain('filter=')
      // The ring the layout is pinned to must still be present.
      expect(svg).toContain('r="84.5"')
    }
  })

  it('with zero overlap, the inner hole equals the avatar size exactly', () => {
    for (const avatar of [40, 88, 104]) {
      const layer = computeRankFrameLayerSize(avatar, 0)
      const hole = (RANK_FRAME_INNER / RANK_FRAME_VIEWBOX) * layer
      expect(hole).toBeCloseTo(avatar, 6)
    }
  })

  it('default overlap laps the ring over the avatar rim by RANK_FRAME_OVERLAP px per side', () => {
    const avatar = 104
    const layer = computeRankFrameLayerSize(avatar)
    const hole = (RANK_FRAME_INNER / RANK_FRAME_VIEWBOX) * layer
    expect(hole).toBeCloseTo(avatar - RANK_FRAME_OVERLAP * 2, 6)
  })

  it('scales the layer proportionally, not by a constant offset', () => {
    const a = computeRankFrameLayerSize(40, 0)
    const b = computeRankFrameLayerSize(80, 0)
    expect(b).toBeCloseTo(a * 2, 6)
  })
})
