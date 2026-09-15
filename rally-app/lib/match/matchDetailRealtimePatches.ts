import type {
  AlphaRefereeLiveScoreDraft,
  AlphaRefereePlayerStatDraft,
  AlphaRefereeQuarterBoundary,
  BasketballPlayerStatDraft,
  MatchWithRelations,
  PlayerScoreDraft,
  PlayerScoreDraftBadmintonSet,
  PlayerScoreDraftBasketballStat,
  RefereeMatchRecord,
  RefereeTrustTier,
  Side,
} from '@/types/match'

const MAX_REALTIME_RECOVERY_DELAY_MS = 10_000

export type AlphaRefereeLiveScoreDraftRealtimeRow = {
  id?: string
  match_id?: string
  assignment_id?: string
  referee_user_id?: string
  status?: 'open' | 'submitted' | 'correction_requested'
  correction_note?: string | null
  submitted_at?: string | null
  correction_requested_at?: string | null
  quarter_boundaries?: AlphaRefereeQuarterBoundary[] | null
  created_at?: string
  updated_at?: string
}

export type AlphaRefereePlayerStatDraftRealtimeRow = {
  id?: string
  draft_id?: string
  match_id?: string
  user_id?: string
  side_index?: Side
  points?: number
  rebounds?: number
  assists?: number
  blocks?: number
  three_pointers_made?: number
  created_at?: string
  updated_at?: string
}

export type BasketballPlayerStatDraftRealtimeRow = {
  id?: string
  match_id?: string
  user_id?: string
  side_index?: Side
  points?: number
  rebounds?: number
  assists?: number
  blocks?: number
  three_pointers_made?: number
  note?: string | null
  created_at?: string
  updated_at?: string
}

export type PlayerScoreDraftRealtimeRow = {
  id?: string
  match_id?: string
  activity_type?: 'basketball' | 'badminton'
  side_index?: Side
  submitted_by?: string
  status?: 'open' | 'submitted'
  team_score?: number
  basketball_stats?: PlayerScoreDraftBasketballStat[] | null
  badminton_sets?: PlayerScoreDraftBadmintonSet[] | null
  note?: string | null
  proof_urls?: string[] | null
  submitted_at?: string | null
  created_at?: string
  updated_at?: string
}

export type RefereeMatchRecordRealtimeRow = {
  id?: string
  match_id?: string
  assignment_id?: string
  referee_user_id?: string
  activity_type?: 'basketball' | 'badminton'
  result_id?: string
  final_status?: 'accepted' | 'corrected' | 'disputed'
  correction_count?: number
  had_dispute?: boolean
  quality_delta?: number
  referee_level_after?: number
  trust_tier_after?: RefereeTrustTier
  settled_at?: string
  created_at?: string
  updated_at?: string
}

export function getMatchRealtimeRecoveryDelay(attempt: number): number {
  return Math.min(500 * (2 ** Math.max(0, attempt)), MAX_REALTIME_RECOVERY_DELAY_MS)
}

export function patchAlphaRefereeLiveScoreDraft(
  match: MatchWithRelations,
  row: AlphaRefereeLiveScoreDraftRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id) return match

  const existing = asArray(match.alpha_referee_live_score_drafts)
  if (eventType === 'DELETE') {
    return {
      ...match,
      alpha_referee_live_score_drafts: existing.filter((draft) => draft.id !== row.id),
    }
  }

  const found = existing.find((draft) => draft.id === row.id)
  const assignmentId = row.assignment_id ?? found?.assignment_id
  const refereeUserId = row.referee_user_id ?? found?.referee_user_id
  const status = row.status ?? found?.status
  const createdAt = row.created_at ?? found?.created_at
  const updatedAt = row.updated_at ?? found?.updated_at
  if (!assignmentId || !refereeUserId || !status || !createdAt || !updatedAt) return match

  const nextDraft: AlphaRefereeLiveScoreDraft = {
    id: row.id,
    match_id: row.match_id ?? found?.match_id ?? match.id,
    assignment_id: assignmentId,
    referee_user_id: refereeUserId,
    status,
    correction_note: hasRealtimeField(row, 'correction_note')
      ? row.correction_note ?? null
      : found?.correction_note ?? null,
    submitted_at: hasRealtimeField(row, 'submitted_at')
      ? row.submitted_at ?? null
      : found?.submitted_at ?? null,
    correction_requested_at: hasRealtimeField(row, 'correction_requested_at')
      ? row.correction_requested_at ?? null
      : found?.correction_requested_at ?? null,
    quarter_boundaries: hasRealtimeField(row, 'quarter_boundaries')
      ? row.quarter_boundaries ?? null
      : found?.quarter_boundaries ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    player_stats: found?.player_stats ?? [],
  }

  return {
    ...match,
    alpha_referee_live_score_drafts: found
      ? existing.map((draft) => draft.id === row.id ? nextDraft : draft)
      : [...existing, nextDraft],
  }
}

export function patchAlphaRefereePlayerStatDraft(
  match: MatchWithRelations,
  row: AlphaRefereePlayerStatDraftRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id || !row.draft_id) return match

  const drafts = asArray(match.alpha_referee_live_score_drafts)
  const draft = drafts.find((candidate) => candidate.id === row.draft_id)
  if (!draft) return match

  const existingStats = draft.player_stats ?? []
  const found = existingStats.find((stat) => stat.id === row.id || stat.user_id === row.user_id)

  const nextStats = eventType === 'DELETE'
    ? existingStats.filter((stat) => stat.id !== row.id)
    : patchPlayerStats(existingStats, found, row, {
      id: row.id,
      draft_id: row.draft_id,
      match_id: row.match_id ?? match.id,
    })

  return {
    ...match,
    alpha_referee_live_score_drafts: drafts.map((candidate) =>
      candidate.id === row.draft_id
        ? { ...candidate, player_stats: nextStats }
        : candidate,
    ),
  }
}

export function patchBasketballPlayerStatDraft(
  match: MatchWithRelations,
  row: BasketballPlayerStatDraftRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id && !row.user_id) return match

  const existing = asArray(match.basketball_player_stat_drafts)
  const found = existing.find((draft) =>
    (row.id && draft.id === row.id) ||
    (row.user_id && draft.user_id === row.user_id)
  )

  if (eventType === 'DELETE') {
    return {
      ...match,
      basketball_player_stat_drafts: existing.filter((draft) =>
        row.id ? draft.id !== row.id : draft.user_id !== row.user_id,
      ),
    }
  }

  const id = row.id ?? found?.id
  const userId = row.user_id ?? found?.user_id
  const sideIndex = row.side_index ?? found?.side_index
  const createdAt = row.created_at ?? found?.created_at
  const updatedAt = row.updated_at ?? found?.updated_at
  if (!id || !userId || sideIndex == null || !createdAt || !updatedAt) return match

  const nextDraft: BasketballPlayerStatDraft = {
    id,
    match_id: row.match_id ?? found?.match_id ?? match.id,
    user_id: userId,
    side_index: sideIndex,
    points: row.points ?? found?.points ?? 0,
    rebounds: row.rebounds ?? found?.rebounds ?? 0,
    assists: row.assists ?? found?.assists ?? 0,
    blocks: row.blocks ?? found?.blocks ?? 0,
    three_pointers_made: row.three_pointers_made ?? found?.three_pointers_made ?? 0,
    note: hasRealtimeField(row, 'note') ? row.note ?? null : found?.note ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }

  return {
    ...match,
    basketball_player_stat_drafts: found
      ? existing.map((draft) => draft.id === id || draft.user_id === userId ? nextDraft : draft)
      : [...existing, nextDraft],
  }
}

export function patchPlayerScoreDraft(
  match: MatchWithRelations,
  row: PlayerScoreDraftRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id && row.side_index == null) return match

  const existing = asArray(match.player_score_drafts)
  const found = existing.find((draft) =>
    (row.id && draft.id === row.id) ||
    (row.side_index != null && draft.side_index === row.side_index)
  )

  if (eventType === 'DELETE') {
    return {
      ...match,
      player_score_drafts: existing.filter((draft) =>
        row.id ? draft.id !== row.id : draft.side_index !== row.side_index,
      ),
    }
  }

  const id = row.id ?? found?.id
  const activityType = row.activity_type ?? found?.activity_type
  const sideIndex = row.side_index ?? found?.side_index
  const submittedBy = row.submitted_by ?? found?.submitted_by
  const status = row.status ?? found?.status
  const teamScore = row.team_score ?? found?.team_score
  const createdAt = row.created_at ?? found?.created_at
  const updatedAt = row.updated_at ?? found?.updated_at
  if (
    !id ||
    !activityType ||
    sideIndex == null ||
    !submittedBy ||
    !status ||
    teamScore == null ||
    !createdAt ||
    !updatedAt
  ) {
    return match
  }

  const nextDraft: PlayerScoreDraft = {
    id,
    match_id: row.match_id ?? found?.match_id ?? match.id,
    activity_type: activityType,
    side_index: sideIndex,
    submitted_by: submittedBy,
    status,
    team_score: teamScore,
    basketball_stats: hasRealtimeField(row, 'basketball_stats')
      ? row.basketball_stats ?? []
      : found?.basketball_stats ?? [],
    badminton_sets: hasRealtimeField(row, 'badminton_sets')
      ? row.badminton_sets ?? []
      : found?.badminton_sets ?? [],
    note: hasRealtimeField(row, 'note') ? row.note ?? null : found?.note ?? null,
    proof_urls: hasRealtimeField(row, 'proof_urls') ? row.proof_urls ?? [] : found?.proof_urls ?? [],
    submitted_at: hasRealtimeField(row, 'submitted_at')
      ? row.submitted_at ?? null
      : found?.submitted_at ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }

  return {
    ...match,
    player_score_drafts: found
      ? existing.map((draft) =>
        draft.id === nextDraft.id || draft.side_index === nextDraft.side_index ? nextDraft : draft,
      )
      : [...existing, nextDraft],
  }
}

export function patchRefereeMatchRecord(
  match: MatchWithRelations,
  row: RefereeMatchRecordRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id && !row.match_id) return match

  const existing = asArray(match.referee_match_records)
  const found = existing.find((record) =>
    (row.id && record.id === row.id) ||
    (row.match_id && record.match_id === row.match_id)
  )

  if (eventType === 'DELETE') {
    return {
      ...match,
      referee_match_records: existing.filter((record) =>
        row.id ? record.id !== row.id : record.match_id !== row.match_id,
      ),
    }
  }

  const id = row.id ?? found?.id
  const assignmentId = row.assignment_id ?? found?.assignment_id
  const refereeUserId = row.referee_user_id ?? found?.referee_user_id
  const activityType = row.activity_type ?? found?.activity_type
  const resultId = row.result_id ?? found?.result_id
  const finalStatus = row.final_status ?? found?.final_status
  const settledAt = row.settled_at ?? found?.settled_at
  const createdAt = row.created_at ?? found?.created_at
  const updatedAt = row.updated_at ?? found?.updated_at
  if (
    !id ||
    !assignmentId ||
    !refereeUserId ||
    !activityType ||
    !resultId ||
    !finalStatus ||
    !settledAt ||
    !createdAt ||
    !updatedAt
  ) {
    return match
  }

  const nextRecord: RefereeMatchRecord = {
    id,
    match_id: row.match_id ?? found?.match_id ?? match.id,
    assignment_id: assignmentId,
    referee_user_id: refereeUserId,
    activity_type: activityType,
    result_id: resultId,
    final_status: finalStatus,
    correction_count: row.correction_count ?? found?.correction_count ?? 0,
    had_dispute: row.had_dispute ?? found?.had_dispute ?? false,
    quality_delta: row.quality_delta ?? found?.quality_delta ?? 0,
    referee_level_after: row.referee_level_after ?? found?.referee_level_after ?? 0,
    trust_tier_after: row.trust_tier_after ?? found?.trust_tier_after ?? 'candidate',
    settled_at: settledAt,
    created_at: createdAt,
    updated_at: updatedAt,
  }

  return {
    ...match,
    referee_match_records: found
      ? existing.map((record) =>
        record.id === nextRecord.id || record.match_id === nextRecord.match_id ? nextRecord : record,
      )
      : [...existing, nextRecord],
  }
}

function patchPlayerStats(
  existingStats: AlphaRefereePlayerStatDraft[],
  found: AlphaRefereePlayerStatDraft | undefined,
  row: AlphaRefereePlayerStatDraftRealtimeRow,
  required: { id: string; draft_id: string; match_id: string },
) {
  const userId = row.user_id ?? found?.user_id
  const sideIndex = row.side_index ?? found?.side_index
  const createdAt = row.created_at ?? found?.created_at
  const updatedAt = row.updated_at ?? found?.updated_at
  if (!userId || sideIndex == null || !createdAt || !updatedAt) return existingStats

  const nextStat: AlphaRefereePlayerStatDraft = {
    id: required.id,
    draft_id: required.draft_id,
    match_id: required.match_id,
    user_id: userId,
    side_index: sideIndex,
    points: row.points ?? found?.points ?? 0,
    rebounds: row.rebounds ?? found?.rebounds ?? 0,
    assists: row.assists ?? found?.assists ?? 0,
    blocks: row.blocks ?? found?.blocks ?? 0,
    three_pointers_made: row.three_pointers_made ?? found?.three_pointers_made ?? 0,
    created_at: createdAt,
    updated_at: updatedAt,
  }

  return found
    ? existingStats.map((stat) => stat.id === nextStat.id || stat.user_id === nextStat.user_id ? nextStat : stat)
    : [...existingStats, nextStat]
}

function hasRealtimeField(row: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, field)
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}
