import { describe, expect, it } from 'vitest'
import { derivePlayerTrustDisplay } from './playerTrustRecord'
import type { UserStats } from './profileRepository'

describe('derivePlayerTrustDisplay', () => {
  it('labels a clean referee-backed record as high confidence', () => {
    const display = derivePlayerTrustDisplay(stats({
      totalMatches: 10,
      refereeVerifiedMatches: 6,
      cleanVerifiedMatches: 6,
    }))

    expect(display.confidenceLabel).toBe('High')
    expect(display.coveragePercent).toBe(60)
    expect(display.qualityPercent).toBe(100)
  })

  it('keeps unverified histories playable but open', () => {
    const display = derivePlayerTrustDisplay(stats({
      totalMatches: 8,
      refereeVerifiedMatches: 0,
    }))

    expect(display.confidenceLabel).toBe('Open')
    expect(display.detail).toContain('Invite a referee')
  })

  it('penalizes disputed verified matches in the quality percentage', () => {
    const display = derivePlayerTrustDisplay(stats({
      totalMatches: 4,
      refereeVerifiedMatches: 4,
      cleanVerifiedMatches: 2,
      disputedVerifiedMatches: 2,
    }))

    expect(display.qualityPercent).toBe(68)
    expect(display.confidenceLabel).toBe('Building')
  })
})

function stats(record: Partial<UserStats['trusted_record']> & { totalMatches: number }): UserStats {
  return {
    total_matches: record.totalMatches,
    total_wins: 0,
    total_losses: 0,
    total_ties: 0,
    trusted_record: {
      totalMatches: record.totalMatches,
      refereeVerifiedMatches: record.refereeVerifiedMatches ?? 0,
      refereeVerifiedWins: record.refereeVerifiedWins ?? 0,
      refereeVerifiedLosses: record.refereeVerifiedLosses ?? 0,
      refereeVerifiedTies: record.refereeVerifiedTies ?? 0,
      cleanVerifiedMatches: record.cleanVerifiedMatches ?? 0,
      correctedVerifiedMatches: record.correctedVerifiedMatches ?? 0,
      disputedVerifiedMatches: record.disputedVerifiedMatches ?? 0,
      bestRefereeLevel: record.bestRefereeLevel ?? 0,
      latestRefereeVerifiedAt: record.latestRefereeVerifiedAt ?? null,
    },
  }
}
