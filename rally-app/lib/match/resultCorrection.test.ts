import { describe, it, expect } from 'vitest'
import { deriveWinnerSideFromScore, validateProposedResult, summarizeProposedResult } from './resultCorrection'

describe('deriveWinnerSideFromScore', () => {
  it('higher side wins', () => {
    expect(deriveWinnerSideFromScore(78, 72)).toEqual({ winnerSide: 0, isTie: false })
    expect(deriveWinnerSideFromScore(70, 80)).toEqual({ winnerSide: 1, isTie: false })
  })
  it('equal is a tie', () => {
    expect(deriveWinnerSideFromScore(70, 70)).toEqual({ winnerSide: null, isTie: true })
  })
})

describe('validateProposedResult', () => {
  it('team sport requires both scores', () => {
    const r = validateProposedResult({ isTie: false }, 'basketball')
    expect(r.ok).toBe(false)
  })
  it('team sport derives tie/winner from scores', () => {
    const r = validateProposedResult({ side0Score: 78, side1Score: 72, isTie: false }, 'basketball')
    expect(r).toMatchObject({ ok: true, payload: { winnerSide: 0, isTie: false } })
  })
  it('running accepts a winner side without scores', () => {
    const r = validateProposedResult({ winnerSide: 1, isTie: false }, 'running')
    expect(r).toMatchObject({ ok: true })
  })
  it('rejects negative score', () => {
    expect(validateProposedResult({ side0Score: -1, side1Score: 2, isTie: false }, 'basketball').ok).toBe(false)
  })
})

describe('summarizeProposedResult', () => {
  it('formats team score', () => {
    expect(summarizeProposedResult({ proposed_side_0_score: 78, proposed_side_1_score: 72, proposed_winner_side: 0, proposed_is_tie: false }))
      .toContain('78')
  })
})
