import type { MyMatch, Side } from '@/types/match'

export type TeamResultReviewAction = {
  scoreLabel: string
  updatedAt: string
}

export function getPendingTeamResultReviewAction(
  match: MyMatch,
  userId: string,
): TeamResultReviewAction | null {
  if (match.status !== 'in_progress') return null
  if (!isTeamSport(match.activity_type)) return null
  if (hasOpenTeamResultChallenge(match)) return null

  const mySide = getMySide(match, userId)
  if (mySide == null) return null

  const submissions = match.match_team_result_submissions ?? []
  const sideA = submissions.find((submission) => submission.side_index === 0)
  const sideB = submissions.find((submission) => submission.side_index === 1)
  if (!sideA || !sideB) return null

  const mySubmission = submissions.find((submission) => submission.side_index === mySide)
  if (mySubmission?.accepted_at) return null

  return {
    scoreLabel: `${sideA.team_score} - ${sideB.team_score}`,
    updatedAt: latestIso([sideA.updated_at, sideB.updated_at, match.updated_at]) ?? match.updated_at,
  }
}

function isTeamSport(activityType: string) {
  return activityType === 'basketball' || activityType === 'badminton'
}

function getMySide(match: MyMatch, userId: string): Side | null {
  return match.match_participants?.find((participant) => participant.user_id === userId)?.side ?? null
}

function hasOpenTeamResultChallenge(match: MyMatch): boolean {
  return (match.match_abuse_reports ?? []).some((report) =>
    report.reason === 'team_result_incorrect' &&
    (report.status === 'open' || report.status === 'reviewing')
  )
}

function latestIso(candidates: Array<string | null | undefined>): string | null {
  let latest = Number.NEGATIVE_INFINITY
  for (const candidate of candidates) {
    if (!candidate) continue
    const value = Date.parse(candidate)
    if (Number.isFinite(value)) latest = Math.max(latest, value)
  }
  return Number.isFinite(latest) ? new Date(latest).toISOString() : null
}
