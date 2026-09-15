import type { MyMatch, Side } from '@/types/match'

import { ACTIVITY_LABEL, deriveRunningMode, isVisibleActivity, type Activity } from './matchConfig'

type ActivityRatingPreviewInput = {
  activity: string
  rating: number
  tier?: string | null
  matches: number
}

export type NewMatchRatingPreview = {
  rating: number
  matches: number
  tierLabel: string
  meta: string
}

export type NewMatchHistoryTone = 'win' | 'loss' | 'tie'

export type NewMatchHistoryRow = {
  result: 'W' | 'L' | 'T'
  score: string
  meta: string
  delta: string
  tone: NewMatchHistoryTone
}

export function getNewMatchRatingPreview(
  activity: Activity | undefined,
  ratings: readonly ActivityRatingPreviewInput[] | undefined,
): NewMatchRatingPreview {
  if (!activity) {
    return {
      rating: 0,
      matches: 0,
      tierLabel: 'Locked',
      meta: 'LOCKED ARENA',
    }
  }

  const row = ratings?.find((rating) => rating.activity === activity)
  const rating = row?.rating ?? 0
  const matches = row?.matches ?? 0
  const tierLabel = formatTierLabel(row?.tier)

  return {
    rating,
    matches,
    tierLabel,
    meta: ratings
      ? `${tierLabel.toUpperCase()} TIER · ${formatMatchCount(matches)}`
      : `${ACTIVITY_LABEL[activity].toUpperCase()} ELO`,
  }
}

export function getNewMatchHistoryRows(input: {
  matches: readonly MyMatch[] | undefined
  userId: string | undefined
  activity: Activity | undefined
  limit?: number
}): NewMatchHistoryRow[] {
  const { matches, userId, activity, limit = 2 } = input
  if (!matches || !userId || !activity) return []

  return matches
    .filter((match) =>
      match.status === 'settled' &&
      match.activity_type === activity &&
      isVisibleActivity(match.activity_type) &&
      hasParticipant(match, userId)
    )
    .sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))
    .slice(0, limit)
    .map((match) => toHistoryRow(match, userId, activity))
}

function toHistoryRow(match: MyMatch, userId: string, activity: Activity): NewMatchHistoryRow {
  const tone = getOutcomeTone(match, userId)
  const result = tone === 'win' ? 'W' : tone === 'loss' ? 'L' : 'T'

  return {
    result,
    tone,
    score: getScoreLabel(match, activity),
    meta: `${formatStakeLabel(match.stake)} · ${formatShortDate(match.updated_at)}`,
    delta: getDeltaLabel(match.stake, tone),
  }
}

function getOutcomeTone(match: MyMatch, userId: string): NewMatchHistoryTone {
  if (match.is_tie || !match.winner_user_id) return 'tie'

  const mySide = getParticipantSide(match, userId)
  const winnerSide = getParticipantSide(match, match.winner_user_id)
  if (mySide !== null && winnerSide !== null) {
    return winnerSide === mySide ? 'win' : 'loss'
  }

  return match.winner_user_id === userId ? 'win' : 'loss'
}

function getScoreLabel(match: MyMatch, activity: Activity): string {
  const score = getTeamScoreLabel(match)
  if (score) return score

  const runningMode = deriveRunningMode(match.activity_type, match.rule_params, match.is_coop)
  if (runningMode) return `${runningMode.toUpperCase()} RUN`

  return `${ACTIVITY_LABEL[activity].toUpperCase()} MATCH`
}

function getTeamScoreLabel(match: MyMatch): string | null {
  const sideA = getLatestTeamSubmissionForSide(match, 0)
  const sideB = getLatestTeamSubmissionForSide(match, 1)
  if (!sideA || !sideB) return null

  return `${sideA.team_score} - ${sideB.team_score}`
}

function getLatestTeamSubmissionForSide(match: MyMatch, side: Side) {
  const submissions = (match.match_team_result_submissions ?? [])
    .filter((submission) => submission.side_index === side)
    .sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))

  return submissions[0] ?? null
}

function getParticipantSide(match: MyMatch, userId: string): Side | null {
  const side = match.match_participants?.find((participant) => participant.user_id === userId)?.side
  return side === 0 || side === 1 ? side : null
}

function hasParticipant(match: MyMatch, userId: string): boolean {
  return Boolean(match.match_participants?.some((participant) => participant.user_id === userId))
}

function getDeltaLabel(stake: number, tone: NewMatchHistoryTone): string {
  if (tone === 'tie') return '0'
  const value = formatInteger(stake)
  return tone === 'win' ? `+${value}` : `-${value}`
}

function formatStakeLabel(stake: number): string {
  if (stake <= 0) return 'NO RP'
  return `${formatInteger(stake)} RP`
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value)))
}

function formatMatchCount(matches: number): string {
  const count = formatInteger(matches)
  return `${count} ${matches === 1 ? 'MATCH' : 'MATCHES'}`
}

function formatTierLabel(tier: string | null | undefined): string {
  if (!tier) return 'Bronze'
  return tier.slice(0, 1).toUpperCase() + tier.slice(1)
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'RECENT'

  const month = MONTHS[date.getUTCMonth()] ?? 'RECENT'
  return `${month} ${date.getUTCDate()}`
}

function timestamp(iso: string): number {
  const value = Date.parse(iso)
  return Number.isFinite(value) ? value : 0
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const
