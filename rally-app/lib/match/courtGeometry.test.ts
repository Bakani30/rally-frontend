import { describe, expect, it } from 'vitest'
import {
  courtAspect,
  courtDrawable,
  courtKindForTeamSize,
  FIBA,
  threePointGeometry,
} from '@/lib/match/courtGeometry'

describe('courtGeometry', () => {
  it('maps team sizes to court kinds (all formats on full court)', () => {
    expect(courtKindForTeamSize(5)).toBe('full')
    expect(courtKindForTeamSize(3)).toBe('full')
    expect(courtKindForTeamSize(2)).toBe('full')
    expect(courtKindForTeamSize(1)).toBe('full')
  })

  it('pins FIBA dimensions in meters', () => {
    expect(FIBA.fullCourt).toEqual({ width: 15, length: 28 })
    expect(FIBA.halfCourt).toEqual({ width: 15, length: 11 })
    expect(FIBA.threePointRadius).toBe(6.75)
    expect(FIBA.threePointCornerOffset).toBe(0.9)
    expect(FIBA.keyWidth).toBe(4.9)
    expect(FIBA.keyLength).toBe(5.8)
    expect(FIBA.freeThrowCircleRadius).toBe(1.8)
    expect(FIBA.centerCircleRadius).toBe(1.8)
    expect(FIBA.noChargeRadius).toBe(1.25)
    expect(FIBA.backboardWidth).toBe(1.8)
    expect(FIBA.backboardFromBaseline).toBe(1.2)
    expect(FIBA.hoopFromBaseline).toBe(1.575)
  })

  it('computes the 3pt corner-line length from the arc intersection', () => {
    // x-dist from hoop = 15/2 - 0.9 = 6.6 → y = sqrt(6.75² - 6.6²) ≈ 1.415
    // corner line ends 1.575 + 1.415 ≈ 2.99 m from the baseline
    const g = threePointGeometry()
    expect(g.cornerLineFromSideline).toBe(0.9)
    expect(g.radius).toBe(6.75)
    expect(g.cornerLineLength).toBeCloseTo(2.99, 2)
  })

  it('drawable box: full = court; half = court + bottom apron', () => {
    expect(courtDrawable('full')).toEqual({ width: 15, length: 28 })
    expect(courtDrawable('half')).toEqual({ width: 15, length: 11 + 9 })
    expect(courtAspect('full')).toBeCloseTo(28 / 15, 5)
    expect(courtAspect('half')).toBeCloseTo(20 / 15, 5)
  })
})
