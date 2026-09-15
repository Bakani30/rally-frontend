import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tierEventQueryKeys } from '@/hooks/useTierEvents'
import {
  isMatchStakeRealtimePayload,
  MATCH_STAKE_REALTIME_EVENT,
} from '@/lib/match/matchRealtime'
import {
  isMatchLifecycleRealtimePayload,
  MATCH_LIFECYCLE_REALTIME_EVENT,
} from '@/lib/match/matchRealtimeEvents'
import {
  getMatchRealtimeRecoveryDelay,
  patchAlphaRefereeLiveScoreDraft,
  patchAlphaRefereePlayerStatDraft,
  patchBasketballPlayerStatDraft,
  patchPlayerScoreDraft,
  patchRefereeMatchRecord,
  type AlphaRefereeLiveScoreDraftRealtimeRow,
  type AlphaRefereePlayerStatDraftRealtimeRow,
  type BasketballPlayerStatDraftRealtimeRow,
  type PlayerScoreDraftRealtimeRow,
  type RefereeMatchRecordRealtimeRow,
} from '@/lib/match/matchDetailRealtimePatches'
import { getMatch } from '@/lib/match/matchService'
import { createRefetchCoalescer } from '@/lib/match/refetchCoalescer'
import { supabase } from '@/lib/supabase'
import type {
  MatchAbuseReport,
  MatchCancelRequest,
  MatchInviteStatus,
  MatchParticipant,
  MatchParticipantContribution,
  MatchResultCorrectionRequest,
  MatchStatus,
  MatchTeamResultCorrectionRequest,
  MatchTeamResultSubmission,
  MatchWithRelations,
  Side,
} from '@/types/match'

type MatchRealtimeRow = {
  status?: MatchStatus
  accepted_at?: string | null
  started_at?: string | null
  winner_user_id?: string | null
  is_tie?: boolean
}

type ParticipantRealtimeRow = {
  user_id?: string
  side?: Side
  stake_contribution?: number
  accepted_at?: string | null
  joined_at?: string | null
  is_active?: boolean
  rating_before?: number | null
  rating_after?: number | null
  lobby_position_key?: string | null
}

type InviteRealtimeRow = {
  id?: string
  invitee_user_id?: string
  side?: Side
  status?: MatchInviteStatus
  responded_at?: string | null
}

type TeamResultSubmissionRealtimeRow = {
  id?: string
  side_index?: Side
  submitted_by?: string
  team_score?: number
  notes?: string | null
  proof_urls?: string[] | null
  accepted_by?: string | null
  accepted_at?: string | null
  created_at?: string
  updated_at?: string
}

type ContributionRealtimeRow = {
  user_id?: string
  points?: number
  note?: string | null
}

type CancelRequestRealtimeRow = {
  id?: string
  requested_by?: string
  responded_by?: string | null
  status?: MatchCancelRequest['status']
  requested_at?: string
  responded_at?: string | null
  expires_at?: string
}

type AbuseReportRealtimeRow = {
  id?: string
  reporter_user_id?: string
  reported_user_id?: string | null
  reason?: MatchAbuseReport['reason']
  note?: string | null
  evidence_paths?: string[] | null
  status?: MatchAbuseReport['status']
  created_at?: string
}

type ResultCorrectionRequestRealtimeRow = {
  id?: string
  requested_by?: string
  responded_by?: string | null
  status?: MatchResultCorrectionRequest['status']
  proposed_winner_side?: 0 | 1 | null
  proposed_is_tie?: boolean
  proposed_side_0_score?: number | null
  proposed_side_1_score?: number | null
  proposed_score_log?: MatchResultCorrectionRequest['proposed_score_log']
  requested_at?: string
  responded_at?: string | null
  expires_at?: string
}

type TeamResultCorrectionRequestRealtimeRow = {
  id?: string
  match_id?: string
  requested_by?: string
  requested_side?: 0 | 1
  status?: MatchTeamResultCorrectionRequest['status']
  responded_by?: string | null
  created_at?: string
  expires_at?: string
  resolved_at?: string | null
}

function hasRealtimeField(row: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, field)
}

function invalidateSettlementData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['profile'] })
  queryClient.invalidateQueries({ queryKey: ['wallet-summary'] })
  queryClient.invalidateQueries({ queryKey: ['public-credits'] })
  queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
  queryClient.invalidateQueries({ queryKey: ['user-stats'] })
  queryClient.invalidateQueries({ queryKey: ['my-matches'] })
  // Settlement can change a user's tier (promotion/demotion) — refetch
  // activity-ratings so the Locker's rank-frame cells reflect the new tier
  // instead of staying on the pre-settlement cache. Prefix-match (no
  // userId segment) so it hits whichever user's query is mounted.
  queryClient.invalidateQueries({ queryKey: ['activity-ratings'] })
  // Settlement can mint a tier_events row (promotion/demotion) — refetch the
  // unseen-events query (fixed 30s staleTime, gate mounted once in _layout)
  // so a promotion right after settle isn't silently missed for the session.
  // Prefix-match the key (no userId segment) so it hits whichever user's
  // query is currently mounted.
  queryClient.invalidateQueries({ queryKey: tierEventQueryKeys.unseenPrefix })
}

function patchMatchRow(match: MatchWithRelations, row: MatchRealtimeRow): MatchWithRelations {
  return {
    ...match,
    status: row.status ?? match.status,
    accepted_at: hasRealtimeField(row, 'accepted_at') ? row.accepted_at ?? null : match.accepted_at,
    started_at: hasRealtimeField(row, 'started_at') ? row.started_at ?? null : match.started_at,
    winner_user_id: hasRealtimeField(row, 'winner_user_id') ? row.winner_user_id ?? null : match.winner_user_id,
    is_tie: hasRealtimeField(row, 'is_tie') ? row.is_tie ?? match.is_tie : match.is_tie,
  }
}

function patchTeamResultSubmission(
  match: MatchWithRelations,
  row: TeamResultSubmissionRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id && row.side_index == null) return match

  const existing = match.match_team_result_submissions ?? []
  const found = existing.find((submission) =>
    (row.id && submission.id === row.id) ||
    (row.side_index != null && submission.side_index === row.side_index)
  )

  if (eventType === 'DELETE') {
    return {
      ...match,
      match_team_result_submissions: existing.filter((submission) =>
        row.id ? submission.id !== row.id : submission.side_index !== row.side_index,
      ),
    }
  }

  const sideIndex = row.side_index ?? found?.side_index
  const id = row.id ?? found?.id
  const submittedBy = row.submitted_by ?? found?.submitted_by
  const teamScore = row.team_score ?? found?.team_score
  if (!id || sideIndex == null || !submittedBy || teamScore == null) return match

  const nextSubmission: MatchTeamResultSubmission = {
    id,
    side_index: sideIndex,
    submitted_by: submittedBy,
    team_score: teamScore,
    notes: hasRealtimeField(row, 'notes') ? row.notes ?? null : found?.notes ?? null,
    proof_urls: hasRealtimeField(row, 'proof_urls') ? row.proof_urls ?? [] : found?.proof_urls ?? [],
    accepted_by: hasRealtimeField(row, 'accepted_by') ? row.accepted_by ?? null : found?.accepted_by ?? null,
    accepted_at: hasRealtimeField(row, 'accepted_at') ? row.accepted_at ?? null : found?.accepted_at ?? null,
    created_at: row.created_at ?? found?.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? found?.updated_at ?? new Date().toISOString(),
  }

  const replaced = existing.some((submission) =>
    submission.id === nextSubmission.id || submission.side_index === nextSubmission.side_index
  )

  return {
    ...match,
    match_team_result_submissions: replaced
      ? existing.map((submission) =>
        submission.id === nextSubmission.id || submission.side_index === nextSubmission.side_index
          ? nextSubmission
          : submission,
      )
      : [...existing, nextSubmission],
  }
}

function patchContribution(
  match: MatchWithRelations,
  row: ContributionRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.user_id) return match

  const existing = match.match_participant_contributions ?? []
  if (eventType === 'DELETE') {
    return {
      ...match,
      match_participant_contributions: existing.filter((contribution) => contribution.user_id !== row.user_id),
    }
  }

  const found = existing.find((contribution) => contribution.user_id === row.user_id)
  const nextContribution: MatchParticipantContribution = {
    user_id: row.user_id,
    points: row.points ?? found?.points ?? 0,
    note: hasRealtimeField(row, 'note') ? row.note ?? null : found?.note ?? null,
  }

  return {
    ...match,
    match_participant_contributions: found
      ? existing.map((contribution) =>
        contribution.user_id === row.user_id ? nextContribution : contribution,
      )
      : [...existing, nextContribution],
  }
}

function patchCancelRequest(
  match: MatchWithRelations,
  row: CancelRequestRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id) return match

  const existing = match.match_cancel_requests ?? []
  if (eventType === 'DELETE') {
    return {
      ...match,
      match_cancel_requests: existing.filter((request) => request.id !== row.id),
    }
  }

  const found = existing.find((request) => request.id === row.id)
  const requestedBy = row.requested_by ?? found?.requested_by
  const status = row.status ?? found?.status
  const requestedAt = row.requested_at ?? found?.requested_at
  const expiresAt = row.expires_at ?? found?.expires_at
  if (!requestedBy || !status || !requestedAt || !expiresAt) return match

  const nextRequest: MatchCancelRequest = {
    id: row.id,
    requested_by: requestedBy,
    responded_by: hasRealtimeField(row, 'responded_by') ? row.responded_by ?? null : found?.responded_by ?? null,
    status,
    requested_at: requestedAt,
    responded_at: hasRealtimeField(row, 'responded_at') ? row.responded_at ?? null : found?.responded_at ?? null,
    expires_at: expiresAt,
  }

  return {
    ...match,
    match_cancel_requests: found
      ? existing.map((request) => request.id === row.id ? nextRequest : request)
      : [...existing, nextRequest],
  }
}

function patchAbuseReport(
  match: MatchWithRelations,
  row: AbuseReportRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id) return match

  const existing = match.match_abuse_reports ?? []
  if (eventType === 'DELETE') {
    return {
      ...match,
      match_abuse_reports: existing.filter((report) => report.id !== row.id),
    }
  }

  const found = existing.find((report) => report.id === row.id)
  const reporterUserId = row.reporter_user_id ?? found?.reporter_user_id
  const reason = row.reason ?? found?.reason
  const status = row.status ?? found?.status
  const createdAt = row.created_at ?? found?.created_at
  if (!reporterUserId || !reason || !status || !createdAt) return match

  const nextReport: MatchAbuseReport = {
    id: row.id,
    match_id: match.id,
    reporter_user_id: reporterUserId,
    reported_user_id: hasRealtimeField(row, 'reported_user_id')
      ? row.reported_user_id ?? null
      : found?.reported_user_id ?? null,
    reason,
    note: hasRealtimeField(row, 'note') ? row.note ?? null : found?.note ?? null,
    evidence_paths: hasRealtimeField(row, 'evidence_paths') ? row.evidence_paths ?? [] : found?.evidence_paths ?? [],
    status,
    created_at: createdAt,
  }

  return {
    ...match,
    match_abuse_reports: found
      ? existing.map((report) => report.id === row.id ? nextReport : report)
      : [...existing, nextReport],
  }
}

function patchResultCorrectionRequest(
  match: MatchWithRelations,
  row: ResultCorrectionRequestRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id) return match

  const existing = match.match_result_correction_requests ?? []
  if (eventType === 'DELETE') {
    return {
      ...match,
      match_result_correction_requests: existing.filter((req) => req.id !== row.id),
    }
  }

  const found = existing.find((req) => req.id === row.id)
  const requestedBy = row.requested_by ?? found?.requested_by
  const status = row.status ?? found?.status
  const requestedAt = row.requested_at ?? found?.requested_at
  const expiresAt = row.expires_at ?? found?.expires_at
  if (!requestedBy || !status || !requestedAt || !expiresAt) return match

  const nextRequest: MatchResultCorrectionRequest = {
    id: row.id,
    requested_by: requestedBy,
    responded_by: hasRealtimeField(row, 'responded_by') ? row.responded_by ?? null : found?.responded_by ?? null,
    status,
    proposed_winner_side: hasRealtimeField(row, 'proposed_winner_side')
      ? row.proposed_winner_side ?? null
      : found?.proposed_winner_side ?? null,
    proposed_is_tie: row.proposed_is_tie ?? found?.proposed_is_tie ?? false,
    proposed_side_0_score: hasRealtimeField(row, 'proposed_side_0_score')
      ? row.proposed_side_0_score ?? null
      : found?.proposed_side_0_score ?? null,
    proposed_side_1_score: hasRealtimeField(row, 'proposed_side_1_score')
      ? row.proposed_side_1_score ?? null
      : found?.proposed_side_1_score ?? null,
    proposed_score_log: hasRealtimeField(row, 'proposed_score_log')
      ? row.proposed_score_log ?? null
      : found?.proposed_score_log ?? null,
    requested_at: requestedAt,
    responded_at: hasRealtimeField(row, 'responded_at') ? row.responded_at ?? null : found?.responded_at ?? null,
    expires_at: expiresAt,
  }

  return {
    ...match,
    match_result_correction_requests: found
      ? existing.map((req) => req.id === row.id ? nextRequest : req)
      : [...existing, nextRequest],
  }
}

function patchTeamResultCorrectionRequest(
  match: MatchWithRelations,
  row: TeamResultCorrectionRequestRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.id) return match

  const existing = match.match_team_result_correction_requests ?? []
  if (eventType === 'DELETE') {
    return {
      ...match,
      match_team_result_correction_requests: existing.filter((req) => req.id !== row.id),
    }
  }

  const found = existing.find((req) => req.id === row.id)
  const requestedBy = row.requested_by ?? found?.requested_by
  const requestedSide = row.requested_side ?? found?.requested_side
  const status = row.status ?? found?.status
  const createdAt = row.created_at ?? found?.created_at
  const expiresAt = row.expires_at ?? found?.expires_at
  if (!requestedBy || requestedSide == null || !status || !createdAt || !expiresAt) return match

  const matchId = row.match_id ?? found?.match_id ?? match.id
  const nextRequest: MatchTeamResultCorrectionRequest = {
    id: row.id,
    match_id: matchId,
    requested_by: requestedBy,
    requested_side: requestedSide,
    status,
    responded_by: hasRealtimeField(row, 'responded_by') ? row.responded_by ?? null : found?.responded_by ?? null,
    created_at: createdAt,
    expires_at: expiresAt,
    resolved_at: hasRealtimeField(row, 'resolved_at') ? row.resolved_at ?? null : found?.resolved_at ?? null,
  }

  return {
    ...match,
    match_team_result_correction_requests: found
      ? existing.map((req) => req.id === row.id ? nextRequest : req)
      : [...existing, nextRequest],
  }
}

function patchParticipant(
  match: MatchWithRelations,
  row: ParticipantRealtimeRow,
  eventType: string,
): MatchWithRelations {
  if (!row.user_id) return match

  if (eventType === 'DELETE') {
    return {
      ...match,
      match_participants: match.match_participants.filter((p) => p.user_id !== row.user_id),
    }
  }

  const invite = (match.match_invites ?? []).find((i) => i.invitee_user_id === row.user_id)
  const nextParticipant: MatchParticipant = {
    user_id: row.user_id,
    side: row.side ?? invite?.side ?? 0,
    stake_contribution: row.stake_contribution ?? match.stake,
    accepted_at: row.accepted_at ?? null,
    joined_at: row.joined_at ?? null,
    is_active: row.is_active ?? true,
    rating_before: row.rating_before ?? null,
    rating_after: row.rating_after ?? null,
    lobby_position_key: row.lobby_position_key ?? null,
    users: invite?.invitee ?? null,
  }

  const exists = match.match_participants.some((p) => p.user_id === row.user_id)
  const match_participants = exists
    ? match.match_participants.map((p) =>
        p.user_id === row.user_id
          ? {
              ...p,
              side: row.side ?? p.side,
              stake_contribution: row.stake_contribution ?? p.stake_contribution,
              accepted_at: hasRealtimeField(row, 'accepted_at') ? row.accepted_at ?? null : p.accepted_at,
              joined_at: hasRealtimeField(row, 'joined_at') ? row.joined_at ?? null : p.joined_at,
              is_active: hasRealtimeField(row, 'is_active') ? row.is_active ?? true : p.is_active,
              rating_before: hasRealtimeField(row, 'rating_before') ? row.rating_before ?? null : p.rating_before,
              rating_after: hasRealtimeField(row, 'rating_after') ? row.rating_after ?? null : p.rating_after,
              lobby_position_key: hasRealtimeField(row, 'lobby_position_key')
                ? row.lobby_position_key ?? null
                : p.lobby_position_key,
            }
          : p,
      )
    : [...match.match_participants, nextParticipant]

  return {
    ...match,
    match_participants,
    match_invites: (match.match_invites ?? []).filter((i) => i.invitee_user_id !== row.user_id),
  }
}

function patchInvite(match: MatchWithRelations, row: InviteRealtimeRow): MatchWithRelations {
  if (!row.id) return match
  const match_invites = match.match_invites ?? []
  const status = row.status
  const shouldRemovePendingSlot = status && status !== 'pending'

  if (shouldRemovePendingSlot) {
    return {
      ...match,
      match_invites: match_invites.map((invite) =>
        invite.id === row.id
          ? {
              ...invite,
              status,
              responded_at: hasRealtimeField(row, 'responded_at') ? row.responded_at ?? null : invite.responded_at,
            }
          : invite,
      ),
    }
  }

  return {
    ...match,
    match_invites: match_invites.map((invite) =>
      invite.id === row.id
        ? {
            ...invite,
            status: row.status ?? invite.status,
            side: row.side ?? invite.side,
            responded_at: hasRealtimeField(row, 'responded_at') ? row.responded_at ?? null : invite.responded_at,
          }
        : invite,
    ),
  }
}

// Realtime events on a busy multiplayer match arrive in bursts (accept, start,
// settle, draft ticks). Each one wants an authoritative getMatch refetch — a
// ~20-relation read. Firing them all concurrently saturates the DB and trips
// the 8s statement timeout (observed in prod as bursts of 500s). Coalescing
// bounds it to one refetch per window while the optimistic patches keep the UI
// live in between.
const MATCH_REFETCH_COALESCE_MS = 350

export function useMatch(id: string | undefined) {
  const queryClient = useQueryClient()
  const recoveryAttemptRef = useRef(0)
  const [subscriptionVersion, setSubscriptionVersion] = useState(0)
  const cached = queryClient.getQueryData<MatchWithRelations>(['match', id])
  const alphaRefereeRealtimeAvailable =
    cached?.match_referee_assignments != null ||
    cached?.alpha_referee_result_submissions != null ||
    cached?.alpha_referee_live_score_drafts != null ||
    cached?.referee_match_records != null
  const basketballSelfStatRealtimeAvailable = cached?.basketball_player_stat_drafts != null
  const playerScoreDraftRealtimeAvailable = cached?.player_score_drafts != null

  useEffect(() => {
    if (!id) return

    const topic = `match:${id}`
    let disposed = false
    let recoveryTimer: ReturnType<typeof setTimeout> | null = null
    let recoveryScheduled = false

    // Every realtime handler routes its authoritative refetch through this
    // coalescer so a burst of events collapses into one getMatch instead of a
    // storm. Optimistic patches still apply immediately per-event, so relations
    // stay fresh — only the heavy refetch is throttled.
    const matchRefetch = createRefetchCoalescer(() => {
      void queryClient.refetchQueries({ queryKey: ['match', id], type: 'active' })
    }, MATCH_REFETCH_COALESCE_MS)

    const scheduleRecovery = () => {
      if (disposed || recoveryScheduled) return
      recoveryScheduled = true
      void queryClient.refetchQueries({ queryKey: ['match', id], type: 'active' })
      const attempt = recoveryAttemptRef.current
      recoveryAttemptRef.current = Math.min(attempt + 1, 5)
      const delay = getMatchRealtimeRecoveryDelay(attempt)
      recoveryTimer = setTimeout(() => {
        if (disposed) return
        setSubscriptionVersion((version) => version + 1)
      }, delay)
    }

    // Remove stale channels synchronously before subscribing to avoid the
    // "cannot add postgres_changes callbacks after subscribe()" error that
    // occurs when an async setup races with a second effect execution.
    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const builder = supabase
      .channel(topic)
      // Stake/accept fast-path: spoof-safe like the lifecycle hint below. The
      // payload is NEVER trusted — any participant could broadcast a fake
      // accept (paint someone as ready) or a fake stake_update (silently
      // un-ready the whole lobby on peers) — so we only refetch the
      // authoritative row. postgres_changes on match_participants remains the
      // backstop; this just shaves the replication lag.
      .on('broadcast', { event: MATCH_STAKE_REALTIME_EVENT }, ({ payload }) => {
        if (!isMatchStakeRealtimePayload(payload, id)) return
        // Leading-edge throttle: the first hint refetches instantly (this
        // fast-path exists to shave replication lag off accept/stake
        // propagation), but the topic has NO broadcast authorization — any
        // authenticated client can flood spoofed events — so repeats inside
        // the window are bounded to one trailing refetch.
        matchRefetch.scheduleLeading()
      })
      // Lifecycle hint (cancel / cancel-request / resolution): the payload is
      // never trusted — we just refetch the authoritative row immediately so a
      // cancel propagates without waiting on Postgres replication. A spoofed
      // event only costs a harmless refetch; the screen dismisses solely on the
      // DB-confirmed status.
      .on('broadcast', { event: MATCH_LIFECYCLE_REALTIME_EVENT }, ({ payload }) => {
        if (!isMatchLifecycleRealtimePayload(payload, id)) return
        // Spammable lobby kinds (side toggle, multi-invite) go through the
        // 350ms trailing coalescer so a rapid-toggling peer cannot re-open the
        // refetch-storm class PR #63 bounded. All other kinds use the
        // leading-edge throttle: a legit cancel/settle hint refetches
        // instantly, but because the topic has no broadcast authorization
        // (any authenticated client can send spoofed lifecycle kinds),
        // repeats inside the window collapse to one trailing refetch instead
        // of amplifying into a per-event refetch storm.
        if (payload.kind === 'position_changed' || payload.kind === 'invited') {
          matchRefetch.schedule()
          return
        }
        matchRefetch.scheduleLeading()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const row = (payload.new ?? {}) as MatchRealtimeRow
            queryClient.setQueryData<MatchWithRelations>(
              ['match', id],
              (old) => (old ? patchMatchRow(old, row) : old),
            )
            if (row.status === 'settled') {
              invalidateSettlementData(queryClient)
            }
          }
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participants', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as ParticipantRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchParticipant(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_submissions', filter: `match_id=eq.${id}` },
        () => {
          matchRefetch.schedule()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_team_result_submissions', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as TeamResultSubmissionRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchTeamResultSubmission(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )

    if (alphaRefereeRealtimeAvailable) {
      builder
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_referee_assignments', filter: `match_id=eq.${id}` },
          () => {
            matchRefetch.schedule()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alpha_referee_result_submissions', filter: `match_id=eq.${id}` },
          () => {
            matchRefetch.schedule()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alpha_referee_live_score_drafts', filter: `match_id=eq.${id}` },
          (payload) => {
            const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as AlphaRefereeLiveScoreDraftRealtimeRow
            let patched = false
            queryClient.setQueryData<MatchWithRelations>(
              ['match', id],
              (old) => {
                if (!old) return old
                const next = patchAlphaRefereeLiveScoreDraft(old, row, payload.eventType)
                patched = next !== old
                return next
              },
            )
            if (!patched) matchRefetch.schedule()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alpha_referee_player_stat_drafts', filter: `match_id=eq.${id}` },
          (payload) => {
            const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as AlphaRefereePlayerStatDraftRealtimeRow
            let patched = false
            queryClient.setQueryData<MatchWithRelations>(
              ['match', id],
              (old) => {
                if (!old) return old
                const next = patchAlphaRefereePlayerStatDraft(old, row, payload.eventType)
                patched = next !== old
                return next
              },
            )
            if (!patched) matchRefetch.schedule()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'referee_match_records', filter: `match_id=eq.${id}` },
          (payload) => {
            const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as RefereeMatchRecordRealtimeRow
            let patched = false
            queryClient.setQueryData<MatchWithRelations>(
              ['match', id],
              (old) => {
                if (!old) return old
                const next = patchRefereeMatchRecord(old, row, payload.eventType)
                patched = next !== old
                return next
              },
            )
            if (!patched) matchRefetch.schedule()
          },
        )
    }

    if (basketballSelfStatRealtimeAvailable) {
      builder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'basketball_player_stat_drafts', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as BasketballPlayerStatDraftRealtimeRow
          let patched = false
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => {
              if (!old) return old
              const next = patchBasketballPlayerStatDraft(old, row, payload.eventType)
              patched = next !== old
              return next
            },
          )
          if (!patched) matchRefetch.schedule()
        },
      )
    }

    if (playerScoreDraftRealtimeAvailable) {
      builder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_score_drafts', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as PlayerScoreDraftRealtimeRow
          let patched = false
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => {
              if (!old) return old
              const next = patchPlayerScoreDraft(old, row, payload.eventType)
              patched = next !== old
              return next
            },
          )
          if (!patched) matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
    }

    builder
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participant_contributions', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as ContributionRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchContribution(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_cancel_requests', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as CancelRequestRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchCancelRequest(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_result_correction_requests', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as ResultCorrectionRequestRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchResultCorrectionRequest(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_team_result_correction_requests', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as TeamResultCorrectionRequestRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchTeamResultCorrectionRequest(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_abuse_reports', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as AbuseReportRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchAbuseReport(old, row, payload.eventType) : old),
          )
          matchRefetch.schedule()
          queryClient.invalidateQueries({ queryKey: ['my-matches'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_invites', filter: `match_id=eq.${id}` },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as InviteRealtimeRow
          queryClient.setQueryData<MatchWithRelations>(
            ['match', id],
            (old) => (old ? patchInvite(old, row) : old),
          )
          matchRefetch.schedule()
        },
      )

    const channel = builder.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        recoveryAttemptRef.current = 0
        // Close the missed-event window: anything committed between the fetch
        // that rendered this screen and the channel actually attaching (or
        // during a resubscribe cycle) never produces a postgres_changes event.
        // One refetch on attach re-syncs to the authoritative row — this is
        // what made "enter the room / accept the result" show stale state.
        void queryClient.refetchQueries({ queryKey: ['match', id], type: 'active' })
        return
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // Surface the failure instead of silently degrading to refetch-on-recovery.
        // A persistent CHANNEL_ERROR usually means a bound table is missing from
        // the supabase_realtime publication, or the Realtime tenant is unhealthy
        // (e.g. staging) — both present as "realtime feels laggy" with no error.
        if (__DEV__) {
          console.warn(
            `[realtime] match channel ${status} (id=${id}) — realtime updates will lag; ` +
              `check supabase_realtime publication (npm run check:realtime-publication) + tenant health`,
          )
        }
        scheduleRecovery()
      }
    })

    return () => {
      disposed = true
      if (recoveryTimer) clearTimeout(recoveryTimer)
      matchRefetch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [
    alphaRefereeRealtimeAvailable,
    basketballSelfStatRealtimeAvailable,
    playerScoreDraftRealtimeAvailable,
    id,
    queryClient,
    subscriptionVersion,
  ])

  return useQuery({
    queryKey: ['match', id],
    enabled: !!id,
    queryFn: () => getMatch(id!),
    // Realtime channels above cover every table this query depends on.
    // Window-focus + reconnect refetch is the safety net if websocket
    // briefly drops events.
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}
