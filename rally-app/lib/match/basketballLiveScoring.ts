import type {
  AlphaRefereePlayerStatDraft,
  MatchParticipant,
  MatchStatus,
  MatchTeamResultSubmission,
  PlayerScoreDraft,
  PlayerScoreDraftBasketballStat,
  Side,
} from '@/types/match'

export type BasketballLiveStatLine = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export type BasketballLiveStatsByUser = Record<string, BasketballLiveStatLine>

export function emptyBasketballLiveStatLine(): BasketballLiveStatLine {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    blocks: 0,
    threePointersMade: 0,
  }
}

export function normalizeBasketballLiveStatLine(
  input: Partial<BasketballLiveStatLine> | null | undefined,
): BasketballLiveStatLine {
  return {
    points: nonNegativeInteger(input?.points),
    rebounds: nonNegativeInteger(input?.rebounds),
    assists: nonNegativeInteger(input?.assists),
    blocks: nonNegativeInteger(input?.blocks),
    threePointersMade: nonNegativeInteger(input?.threePointersMade),
  }
}

export function buildBasketballLiveStatsByUser(input: {
  participants: MatchParticipant[]
  refereeStatDrafts?: AlphaRefereePlayerStatDraft[]
  playerScoreDrafts?: PlayerScoreDraft[]
  optimisticStats?: BasketballLiveStatsByUser
}): BasketballLiveStatsByUser {
  const stats: BasketballLiveStatsByUser = {}
  const activeUserIds = new Set(activeParticipants(input.participants).map((participant) => participant.user_id))

  for (const participant of activeParticipants(input.participants)) {
    stats[participant.user_id] = emptyBasketballLiveStatLine()
  }

  for (const draft of input.refereeStatDrafts ?? []) {
    if (!activeUserIds.has(draft.user_id)) continue
    stats[draft.user_id] = fromRefereeDraft(draft)
  }

  for (const draft of latestPlayerScoreDraftsBySide(input.playerScoreDrafts ?? [])) {
    for (const stat of draft.basketball_stats ?? []) {
      if (!activeUserIds.has(stat.userId)) continue
      stats[stat.userId] = fromPlayerScoreDraftStat(stat)
    }
  }

  for (const [userId, optimistic] of Object.entries(input.optimisticStats ?? {})) {
    if (!activeUserIds.has(userId)) continue
    stats[userId] = normalizeBasketballLiveStatLine(optimistic)
  }

  return stats
}

export function getBasketballLiveScoreBySide(
  participants: MatchParticipant[],
  statsByUser: BasketballLiveStatsByUser,
): Record<Side, number> {
  return activeParticipants(participants).reduce<Record<Side, number>>(
    (scores, participant) => {
      scores[participant.side] += statsByUser[participant.user_id]?.points ?? 0
      return scores
    },
    { 0: 0, 1: 0 },
  )
}

export function buildNoRefereeBasketballStats(
  participants: MatchParticipant[],
  side: Side,
  statsByUser: BasketballLiveStatsByUser,
): PlayerScoreDraftBasketballStat[] {
  return activeParticipants(participants)
    .filter((participant) => participant.side === side)
    .map((participant) => {
      const stat = normalizeBasketballLiveStatLine(statsByUser[participant.user_id])
      return {
        userId: participant.user_id,
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        blocks: stat.blocks,
        threePointersMade: stat.threePointersMade,
      }
    })
}

export function hasAnyBasketballLiveStat(statsByUser: BasketballLiveStatsByUser): boolean {
  return Object.values(statsByUser).some(hasAnyStatValue)
}

export function hasAnyBasketballLiveStatForSide(input: {
  participants: MatchParticipant[]
  side: Side
  statsByUser: BasketballLiveStatsByUser
}): boolean {
  return activeParticipants(input.participants)
    .filter((participant) => participant.side === input.side)
    .some((participant) => hasAnyStatValue(input.statsByUser[participant.user_id]))
}

export function canEditBasketballLiveStat(input: {
  matchStatus: MatchStatus
  hasReferee: boolean
  refereeCanEdit: boolean
  currentUserSide: Side | null
  targetSide: Side
  targetIsActive?: boolean
  ownSideSubmitted?: boolean
}): boolean {
  if (input.matchStatus !== 'in_progress') return false
  if (input.targetIsActive === false) return false
  if (input.hasReferee) return input.refereeCanEdit
  if (input.currentUserSide == null || input.ownSideSubmitted) return false
  return input.currentUserSide === input.targetSide
}

export function canSubmitBasketballEndGame(input: {
  matchStatus: MatchStatus
  hasReferee: boolean
  refereeCanSubmit: boolean
  playerCanSubmit: boolean
  currentUserSide: Side | null
  ownSideSubmitted?: boolean
  participants: MatchParticipant[]
  statsByUser: BasketballLiveStatsByUser
}): boolean {
  if (input.matchStatus !== 'in_progress') return false
  if (input.hasReferee) {
    return input.refereeCanSubmit && hasAnyBasketballLiveStat(input.statsByUser)
  }
  if (!input.playerCanSubmit || input.currentUserSide == null || input.ownSideSubmitted) return false
  return hasAnyBasketballLiveStatForSide({
    participants: input.participants,
    side: input.currentUserSide,
    statsByUser: input.statsByUser,
  })
}

export function hasBothTeamResultSubmissions(submissions: MatchTeamResultSubmission[]): boolean {
  return submissions.some((submission) => submission.side_index === 0)
    && submissions.some((submission) => submission.side_index === 1)
}

export function isPlayerScoreDraftSubmittedForSide(
  drafts: PlayerScoreDraft[],
  side: Side,
): boolean {
  return latestPlayerScoreDraftForSide(drafts, side)?.status === 'submitted'
}

function fromRefereeDraft(draft: AlphaRefereePlayerStatDraft): BasketballLiveStatLine {
  return normalizeBasketballLiveStatLine({
    points: draft.points,
    rebounds: draft.rebounds,
    assists: draft.assists,
    blocks: draft.blocks,
    threePointersMade: draft.three_pointers_made,
  })
}

function fromPlayerScoreDraftStat(stat: PlayerScoreDraftBasketballStat): BasketballLiveStatLine {
  return normalizeBasketballLiveStatLine(stat)
}

function latestPlayerScoreDraftsBySide(drafts: PlayerScoreDraft[]): PlayerScoreDraft[] {
  const bySide = new Map<Side, PlayerScoreDraft>()
  for (const draft of drafts) {
    const existing = bySide.get(draft.side_index)
    if (!existing || draft.updated_at.localeCompare(existing.updated_at) > 0) {
      bySide.set(draft.side_index, draft)
    }
  }
  return Array.from(bySide.values())
}

function latestPlayerScoreDraftForSide(
  drafts: PlayerScoreDraft[],
  side: Side,
): PlayerScoreDraft | null {
  return latestPlayerScoreDraftsBySide(drafts).find((draft) => draft.side_index === side) ?? null
}

function hasAnyStatValue(stat: BasketballLiveStatLine | null | undefined): boolean {
  if (!stat) return false
  return stat.points > 0 ||
    stat.rebounds > 0 ||
    stat.assists > 0 ||
    stat.blocks > 0 ||
    stat.threePointersMade > 0
}

function activeParticipants(participants: MatchParticipant[]): MatchParticipant[] {
  return participants.filter((participant) => participant.is_active !== false)
}

function nonNegativeInteger(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.trunc(numeric))
}
