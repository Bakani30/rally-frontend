import type { PlayerTrustedRecord, UserStats } from './profileRepository'

export type PlayerTrustDisplay = {
  coveragePercent: number
  qualityPercent: number
  confidenceLabel: 'High' | 'Medium' | 'Building' | 'Open'
  tone: 'green' | 'amber' | 'neutral'
  verifiedRecordLabel: string
  headline: string
  detail: string
}

export function derivePlayerTrustDisplay(stats: UserStats | null | undefined): PlayerTrustDisplay {
  const record = normalizeRecord(stats)
  const totalMatches = Math.max(record.totalMatches, stats?.total_matches ?? 0)
  const verified = Math.max(0, record.refereeVerifiedMatches)
  const clean = Math.max(0, record.cleanVerifiedMatches)
  const corrected = Math.max(0, record.correctedVerifiedMatches)
  const disputed = Math.max(0, record.disputedVerifiedMatches)
  const coveragePercent = totalMatches > 0 ? Math.round((verified / totalMatches) * 100) : 0
  const weightedClean = clean + corrected * 0.72 + disputed * 0.36
  const qualityPercent = verified > 0 ? Math.round((weightedClean / verified) * 100) : 0
  const confidenceLabel = confidenceFor({ verified, coveragePercent, qualityPercent })
  const tone = confidenceLabel === 'High'
    ? 'green'
    : confidenceLabel === 'Medium' || confidenceLabel === 'Building'
      ? 'amber'
      : 'neutral'

  return {
    coveragePercent,
    qualityPercent,
    confidenceLabel,
    tone,
    verifiedRecordLabel: `${record.refereeVerifiedWins}W-${record.refereeVerifiedLosses}L-${record.refereeVerifiedTies}T`,
    headline: verified > 0 ? `${verified} referee-verified matches` : 'No referee-verified matches yet',
    detail: verified > 0
      ? `${coveragePercent}% of match history carries neutral scoring`
      : 'Invite a referee to make the next result easier to trust',
  }
}

function confidenceFor(input: {
  verified: number
  coveragePercent: number
  qualityPercent: number
}): PlayerTrustDisplay['confidenceLabel'] {
  if (input.verified >= 5 && input.coveragePercent >= 45 && input.qualityPercent >= 82) return 'High'
  if (input.verified >= 3 && input.coveragePercent >= 28 && input.qualityPercent >= 70) return 'Medium'
  if (input.verified > 0) return 'Building'
  return 'Open'
}

function normalizeRecord(stats: UserStats | null | undefined): PlayerTrustedRecord {
  const record = stats?.trusted_record
  return {
    totalMatches: record?.totalMatches ?? stats?.total_matches ?? 0,
    refereeVerifiedMatches: record?.refereeVerifiedMatches ?? 0,
    refereeVerifiedWins: record?.refereeVerifiedWins ?? 0,
    refereeVerifiedLosses: record?.refereeVerifiedLosses ?? 0,
    refereeVerifiedTies: record?.refereeVerifiedTies ?? 0,
    cleanVerifiedMatches: record?.cleanVerifiedMatches ?? 0,
    correctedVerifiedMatches: record?.correctedVerifiedMatches ?? 0,
    disputedVerifiedMatches: record?.disputedVerifiedMatches ?? 0,
    bestRefereeLevel: record?.bestRefereeLevel ?? 0,
    latestRefereeVerifiedAt: record?.latestRefereeVerifiedAt ?? null,
  }
}
