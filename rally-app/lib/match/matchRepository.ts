import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { JoinMode, MatchAbuseReportReason, MatchLobby, MatchWithRelations, MyMatch, MyPendingInvite, ProposedResultPayload, PublicStakeCurrency, Side, StakeCurrency } from '@/types/match'
import { isVisibleActivity, type Activity } from './matchConfig'

function toHelpfulRpcError(error: { code?: string; message: string }) {
  if (error.code === 'PGRST202') {
    return new Error('Backend migration is missing on Supabase. Deploy the latest match discovery migrations first.')
  }

  return error
}

export const MATCH_DETAIL_ALPHA_SELECT = `
  id, source, created_by, activity_type, rule_text, rule_params, stake, stake_currency, deadline, status,
  accepted_at, started_at,
  winner_user_id, is_tie, is_coop, allow_spectators, team_size_per_side, join_mode, join_code, entry_code,
  match_participants (
    user_id, side, stake_contribution, accepted_at, joined_at, is_active, rating_before, rating_after,
    lobby_position_key,
    users ( id, display_name, handle, avatar_url, jersey_number, leaderboard_score )
  ),
  match_invites (
    id, match_id, invitee_user_id, inviter_user_id, side, status, sent_at, responded_at,
    invitee:users!match_invites_invitee_user_id_fkey ( id, display_name, handle, avatar_url, jersey_number, leaderboard_score )
  ),
  match_submissions (
    id, submitted_by, winner_user_id, created_at, activity_session_id,
    activity_sessions (
      id, activity_type, point_delta,
      running_activity_details ( distance_meters, moving_time_seconds, pace_seconds_per_km ),
      team_sport_activity_details (
        format, team_size, side_0_score, side_1_score, winning_side, score_log
      ),
      activity_session_media ( storage_path )
    )
  ),
  match_team_result_submissions (
    id, side_index, submitted_by, team_score, notes, proof_urls, accepted_by, accepted_at, created_at, updated_at
  ),
  match_referee_assignments (
    id, match_id, referee_user_id, activity_type, assigned_by, status, assigned_at, updated_at,
    referee:users!match_referee_assignments_referee_user_id_fkey (
      id, display_name, handle, avatar_url, jersey_number, leaderboard_score
    )
  ),
  alpha_referee_result_submissions (
    id, match_id, assignment_id, referee_user_id, result_kind,
    side_0_score, side_1_score, winner_side, winner_user_id, is_tie,
    note, proof_urls, status, created_at, updated_at,
    referee:users!alpha_referee_result_submissions_referee_user_id_fkey (
      id, display_name, handle, avatar_url, jersey_number, leaderboard_score
    )
  ),
  alpha_referee_live_score_drafts (
    id, match_id, assignment_id, referee_user_id, status,
    correction_note, submitted_at, correction_requested_at, quarter_boundaries, created_at, updated_at,
    player_stats:alpha_referee_player_stat_drafts (
      id, draft_id, match_id, user_id, side_index,
      points, rebounds, assists, blocks, three_pointers_made,
      created_at, updated_at
    )
  ),
  alpha_referee_running_drafts (
    id, match_id, assignment_id, referee_user_id, status,
    target_distance_meters, correction_note, started_at, submitted_at,
    correction_requested_at, created_at, updated_at,
    marks:alpha_referee_running_marks (
      id, draft_id, match_id, participant_user_id, side_index, mark_type,
      checkpoint_index, elapsed_ms, recorded_at, note, created_at, updated_at
    )
  ),
  basketball_player_stat_drafts (
    id, match_id, user_id, side_index,
    points, rebounds, assists, blocks, three_pointers_made,
    note, created_at, updated_at
  ),
  player_score_drafts (
    id, match_id, activity_type, side_index, submitted_by, status, team_score,
    basketball_stats, badminton_sets, note, proof_urls, submitted_at, created_at, updated_at
  ),
  referee_match_records (
    id, match_id, assignment_id, referee_user_id, activity_type, result_id,
    final_status, correction_count, had_dispute, quality_delta,
    referee_level_after, trust_tier_after, settled_at, created_at, updated_at
  ),
  match_cancel_requests (
    id, requested_by, responded_by, status, requested_at, responded_at, expires_at
  ),
  match_result_correction_requests (
    id, requested_by, responded_by, status,
    proposed_winner_side, proposed_is_tie,
    proposed_side_0_score, proposed_side_1_score, proposed_score_log,
    requested_at, responded_at, expires_at
  ),
  match_team_result_correction_requests (
    id, match_id, requested_by, requested_side, status, responded_by, created_at, expires_at, resolved_at
  ),
  match_participant_contributions ( user_id, points, note ),
  match_abuse_reports (
    id, match_id, reporter_user_id, reported_user_id, reason, note, evidence_paths, status, created_at
  )
`

export const MATCH_DETAIL_SELECT = `
  id, source, created_by, activity_type, rule_text, rule_params, stake, stake_currency, deadline, status,
  accepted_at, started_at,
  winner_user_id, is_tie, is_coop, allow_spectators, team_size_per_side, join_mode, join_code, entry_code,
  match_participants (
    user_id, side, stake_contribution, accepted_at, joined_at, is_active, rating_before, rating_after,
    lobby_position_key,
    users ( id, display_name, handle, avatar_url, jersey_number, leaderboard_score )
  ),
  match_invites (
    id, match_id, invitee_user_id, inviter_user_id, side, status, sent_at, responded_at,
    invitee:users!match_invites_invitee_user_id_fkey ( id, display_name, handle, avatar_url, jersey_number, leaderboard_score )
  ),
  match_submissions (
    id, submitted_by, winner_user_id, created_at, activity_session_id,
    activity_sessions (
      id, activity_type, point_delta,
      running_activity_details ( distance_meters, moving_time_seconds, pace_seconds_per_km ),
      team_sport_activity_details (
        format, team_size, side_0_score, side_1_score, winning_side, score_log
      ),
      activity_session_media ( storage_path )
    )
  ),
  match_team_result_submissions (
    id, side_index, submitted_by, team_score, notes, proof_urls, accepted_by, accepted_at, created_at, updated_at
  ),
  match_cancel_requests (
    id, requested_by, responded_by, status, requested_at, responded_at, expires_at
  ),
  match_result_correction_requests (
    id, requested_by, responded_by, status,
    proposed_winner_side, proposed_is_tie,
    proposed_side_0_score, proposed_side_1_score, proposed_score_log,
    requested_at, responded_at, expires_at
  ),
  match_team_result_correction_requests (
    id, match_id, requested_by, requested_side, status, responded_by, created_at, expires_at, resolved_at
  ),
  match_participant_contributions ( user_id, points, note ),
  match_abuse_reports (
    id, match_id, reporter_user_id, reported_user_id, reason, note, evidence_paths, status, created_at
  )
`

export const MATCH_DETAIL_LEGACY_SELECT = `
  id, source, created_by, activity_type, rule_text, rule_params, stake, stake_currency, deadline, status,
  accepted_at, started_at,
  winner_user_id, is_tie, is_coop, allow_spectators, team_size_per_side, join_mode, join_code, entry_code,
  match_participants (
    user_id, side, stake_contribution, accepted_at, is_active, rating_before, rating_after,
    users ( id, display_name, handle, avatar_url, leaderboard_score )
  ),
  match_invites (
    id, match_id, invitee_user_id, inviter_user_id, side, status, sent_at, responded_at,
    invitee:users!match_invites_invitee_user_id_fkey ( id, display_name, handle, avatar_url, leaderboard_score )
  ),
  match_submissions (
    id, submitted_by, winner_user_id, created_at, activity_session_id,
    activity_sessions (
      id, activity_type, point_delta,
      running_activity_details ( distance_meters, moving_time_seconds, pace_seconds_per_km ),
      team_sport_activity_details (
        format, team_size, side_0_score, side_1_score, winning_side, score_log
      ),
      activity_session_media ( storage_path )
    )
  ),
  match_team_result_submissions (
    id, side_index, submitted_by, team_score, notes, proof_urls, accepted_by, accepted_at, created_at, updated_at
  ),
  match_cancel_requests (
    id, requested_by, responded_by, status, requested_at, responded_at, expires_at
  ),
  match_result_correction_requests (
    id, requested_by, responded_by, status,
    proposed_winner_side, proposed_is_tie,
    proposed_side_0_score, proposed_side_1_score, proposed_score_log,
    requested_at, responded_at, expires_at
  ),
  match_participant_contributions ( user_id, points, note ),
  match_abuse_reports (
    id, match_id, reporter_user_id, reported_user_id, reason, note, evidence_paths, status, created_at
  )
`

export type CreateMatchRecordInput = {
  activity: Activity
  teamSize: number
  minStake: number
  creatorStake: number
  stakeCurrency?: PublicStakeCurrency
  ruleText?: string
  ruleParams?: Record<string, unknown>
  joinMode: JoinMode
  entryCode?: string
  deadline: Date
  isCoop?: boolean
  idempotencyKey: string
}

export type CreateMatchRecordResult = {
  matchId: string
  joinCode: string | null
}

export type JoinMatchRecordInput = {
  matchId?: string
  joinCode?: string
  entryCode?: string
  side: Side
  stake: number
}

export type JoinMatchRecordResult = {
  matchId: string
  match: MatchWithRelations
}

export async function createMatchRecord(
  input: CreateMatchRecordInput
): Promise<CreateMatchRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<CreateMatchRecordResult>(
    'create-match',
    {
      body: {
        activity: input.activity,
        teamSize: input.teamSize,
        minStake: input.minStake,
        creatorStake: input.creatorStake,
        ruleText: input.ruleText ?? null,
        ruleParams: input.ruleParams ?? {},
        joinMode: input.joinMode,
        entryCode: input.entryCode ?? null,
        deadline: input.deadline.toISOString(),
        stakeCurrency: input.stakeCurrency ?? 'leaderboard_point',
        isCoop: input.isCoop ?? false,
        idempotencyKey: input.idempotencyKey,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to create match')
  if (!data?.matchId) throw new Error('create-match returned no matchId')
  return { matchId: data.matchId, joinCode: data.joinCode ?? null }
}

export async function inviteParticipantRecord(input: {
  matchId: string
  userId: string
  side: Side
  stake: number
  kind?: 'open' | 'challenge'
}): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('invite-participant', {
    body: {
      matchId: input.matchId,
      inviteeUserId: input.userId,
      side: input.side,
      stake: input.stake,
      kind: input.kind ?? 'open',
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to invite participant')
}

export async function requestRematchRecord(input: {
  originalMatchId: string
  idempotencyKey: string
}): Promise<{ matchId: string; inviteId: string; idempotent: boolean }> {
  const { data, error } = await invokeAuthenticatedFunction<{
    matchId: string
    inviteId: string
    idempotent: boolean
  }>('request-rematch', {
    body: {
      originalMatchId: input.originalMatchId,
      idempotencyKey: input.idempotencyKey,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to request rematch')
  if (!data?.matchId) throw new Error('request-rematch returned no matchId')
  return data
}

export async function acceptParticipantRecord(matchId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('accept-match', {
    body: { matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to accept match')
}

export async function unacceptParticipantRecord(matchId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('unaccept-match', {
    body: { matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to undo accept')
}

export async function cancelInviteRecord(inviteId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('cancel-invite', {
    body: { inviteId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to cancel invite')
}

export async function respondInviteRecord(input: {
  inviteId: string
  action: 'accept' | 'decline'
  stake?: number
}): Promise<{ action: 'accepted' | 'declined' }> {
  const { data, error } = await invokeAuthenticatedFunction<{ action: 'accepted' | 'declined' }>(
    'respond-invite',
    {
      body: {
        inviteId: input.inviteId,
        action: input.action,
        stake: input.action === 'accept' ? input.stake : undefined,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to respond to invite')
  if (!data?.action) throw new Error('respond-invite returned no action')
  return data
}

export async function getPendingInviteStakeRecord(inviteId: string): Promise<number | undefined> {
  const { data, error } = await supabase.rpc('get_pending_invite_summary', {
    p_invite_id: inviteId,
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  const stake = row?.stake
  return Number.isInteger(stake) ? stake : undefined
}

export type CancelMatchAction = 'request' | 'agree' | 'decline'

export async function cancelMatchRecord(matchId: string, action?: CancelMatchAction): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('cancel-match', {
    body: { matchId, action },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to cancel match')
}

export type ResultCorrectionAction = 'request' | 'agree' | 'decline'

export async function resultCorrectionRecord(
  matchId: string,
  action: ResultCorrectionAction,
  proposed?: ProposedResultPayload,
): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('correct-match-result', {
    body: { matchId, action, proposed },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update match result')
}

export async function leaveMatchLobbyRecord(matchId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('leave-match', {
    body: { matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to leave match')
}

export type FinishCoopRunRecordResult = {
  finished: true
  settled: boolean
  cancelled: boolean
  submitted: number
  required: number
  teamDistance: number
  teamReward: number
  rewardPerUser: number
}

export async function finishCoopRunRecord(matchId: string): Promise<FinishCoopRunRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<FinishCoopRunRecordResult>(
    'finish-coop-run',
    { body: { matchId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to finish team run')
  return data as FinishCoopRunRecordResult
}

export async function kickMatchParticipantRecord(input: {
  matchId: string
  targetUserId: string
}): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('leave-match', {
    body: {
      matchId: input.matchId,
      targetUserId: input.targetUserId,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to kick player')
}

export async function reportMatchAbuseRecord(input: {
  matchId: string
  reportedUserId: string | null
  reason: MatchAbuseReportReason
  note?: string | null
  evidencePaths?: string[]
}): Promise<string> {
  const { data, error } = await invokeAuthenticatedFunction<{ reportId: string }>(
    'report-match-abuse',
    {
      body: {
        matchId: input.matchId,
        reportedUserId: input.reportedUserId,
        reason: input.reason,
        note: input.note ?? null,
        evidencePaths: input.evidencePaths ?? [],
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to report match abuse')
  if (!data?.reportId) throw new Error('report-match-abuse returned no reportId')
  return data.reportId
}

export async function updateParticipantStakeRecord(input: {
  matchId: string
  newStake: number
}): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('update-participant-stake', {
    body: {
      matchId: input.matchId,
      newStake: input.newStake,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update stake')
}

export async function updateLobbyPositionRecord(input: {
  matchId: string
  side: Side
  positionKey: string
}): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('update-lobby-position', {
    body: {
      matchId: input.matchId,
      side: input.side,
      positionKey: input.positionKey,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update lobby position')
}

export async function joinMatchRecord(input: JoinMatchRecordInput): Promise<JoinMatchRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<{ matchId: string; match?: unknown }>(
    'join-match',
    {
      body: {
        matchId: input.matchId ?? null,
        joinCode: input.joinCode ?? null,
        entryCode: input.entryCode ?? null,
        side: input.side,
        stake: input.stake,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to join match')
  if (!data?.matchId) throw new Error('join-match returned no matchId')

  const match = 'match' in data && data.match
    ? data.match as MatchWithRelations
    : await getMatchById(data.matchId)
  if (!match) throw new Error('join-match returned no match detail')

  return { matchId: data.matchId, match }
}

export async function getMatchById(matchId: string): Promise<MatchWithRelations | null> {
  let { data, error } = await selectMatchById(matchId, MATCH_DETAIL_ALPHA_SELECT)
  if (error && isMissingAlphaRefereeRelation(error)) {
    ;({ data, error } = await selectMatchById(matchId, MATCH_DETAIL_SELECT))
  }
  if (error && isMissingCourtLobbyColumn(error)) {
    ;({ data, error } = await selectMatchById(matchId, MATCH_DETAIL_LEGACY_SELECT))
  }
  if (error) throw error
  if (!data) return null
  const match = data as unknown as MatchWithRelations
  if (!isVisibleActivity(match.activity_type)) return null
  return match
}

// Resolve the settled activity session behind a match without waiting for the
// full match relations to land in cache — the recap's "ดูวิเคราะห์" button
// navigates first and the report screen resolves this lazily.
export async function getMatchAnalysisSessionIdRecord(matchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('match_submissions')
    .select('activity_session_id, created_at')
    .eq('match_id', matchId)
    .not('activity_session_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as { activity_session_id: string | null } | null)?.activity_session_id ?? null
}

async function selectMatchById(matchId: string, select: string) {
  return supabase
    .from('matches')
    .select(select)
    .eq('id', matchId)
    .maybeSingle()
}

function isMissingCourtLobbyColumn(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? ''
  return error.code === '42703'
    || message.includes('lobby_position_key')
    || message.includes('jersey_number')
    || message.includes('joined_at')
}

function isMissingAlphaRefereeRelation(error: {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}): boolean {
  const text = [error.message, error.details, error.hint].filter(Boolean).join(' ')
  return (
    text.includes('match_referee_assignments') ||
    text.includes('alpha_referee_result_submissions') ||
    text.includes('alpha_referee_live_score_drafts') ||
    text.includes('alpha_referee_player_stat_drafts') ||
    text.includes('alpha_referee_running_drafts') ||
    text.includes('alpha_referee_running_marks') ||
    text.includes('basketball_player_stat_drafts') ||
    text.includes('player_score_drafts') ||
    text.includes('referee_match_records')
  ) && (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST200' ||
    text.includes('Could not find a relationship') ||
    text.includes('does not exist')
  )
}

export async function listOpenMatchLobbiesRecord(): Promise<MatchLobby[]> {
  const { data, error } = await supabase.rpc('list_open_match_lobbies')
  if (error) throw toHelpfulRpcError(error)
  return ((data ?? []) as MatchLobby[]).filter((lobby) =>
    isVisibleActivity(lobby.activity_type),
  )
}

export async function findJoinableMatchByCodeRecord(joinCode: string): Promise<MatchLobby | null> {
  const { data, error } = await supabase.rpc('find_joinable_match_by_code', {
    p_join_code: joinCode,
  })
  if (error) throw toHelpfulRpcError(error)

  const row = Array.isArray(data) ? data[0] : data
  const lobby = (row ?? null) as MatchLobby | null
  return lobby && isVisibleActivity(lobby.activity_type) ? lobby : null
}

export async function listUserMatchIds(userId: string): Promise<string[]> {
  // User's matches are only rooms they have actually joined. Pending invites
  // live in notification surfaces until accepted, so the old invite-preview
  // match detail screen cannot leak in through the Matches list.
  const participantRes = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (participantRes.error) throw participantRes.error
  const ids = new Set<string>()
  for (const r of participantRes.data ?? []) ids.add(r.match_id)
  return Array.from(ids)
}

export async function listMyMatchesRecord(_userId: string): Promise<MyMatch[]> {
  const { data, error } = await supabase.rpc('list_my_matches_for_user')
  if (error) {
    if (error.code === 'PGRST202') {
      const matchIds = await listUserMatchIds(_userId)
      return listMatchesByIds(matchIds)
    }
    throw toHelpfulRpcError(error)
  }
  return ((data ?? []) as MyMatch[]).filter((match) => isVisibleActivity(match.activity_type))
}

export async function listMyPendingInvites(_userId: string): Promise<MyPendingInvite[]> {
  type Row = {
    id: string
    match_id: string
    side: Side
    sent_at: string
    inviter_user_id: string | null
    inviter_display_name: string | null
    inviter_handle: string | null
    inviter_avatar_url: string | null
    activity_type: string
    stake: number
    stake_currency: StakeCurrency
    is_coop: boolean
    status: string
    // Added by a later migration; default to 'open' until list_my_pending_invites ships it.
    kind?: 'open' | 'challenge' | 'rematch'
  }
  const { data, error } = await supabase.rpc('list_my_pending_invites', {
    p_limit: 50,
  })
  if (error) throw error

  return ((data ?? []) as Row[])
    .filter((r) => r.status === 'pending' && isVisibleActivity(r.activity_type))
    .map((r) => ({
      inviteId: r.id,
      matchId: r.match_id,
      side: r.side,
      sentAt: r.sent_at,
      kind: r.kind ?? 'open',
      match: {
        activityType: r.activity_type,
        stake: r.stake,
        stakeCurrency: r.stake_currency,
        isCoop: r.is_coop,
      },
      inviter: r.inviter_user_id
        ? {
            id: r.inviter_user_id,
            displayName: r.inviter_display_name,
            handle: r.inviter_handle,
            avatarUrl: r.inviter_avatar_url,
          }
        : null,
    }))
}

export async function listMatchesByIds(matchIds: string[]): Promise<MyMatch[]> {
  if (matchIds.length === 0) return []

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, created_by, activity_type, rule_params, stake, stake_currency, status, deadline,
      winner_user_id, is_tie, is_coop, updated_at, settled_at,
      match_participants ( user_id, side, is_active ),
      match_team_result_submissions (
        id, side_index, submitted_by, team_score, notes, proof_urls, accepted_by, accepted_at, created_at, updated_at
      ),
      match_abuse_reports (
        id, match_id, reporter_user_id, reported_user_id, reason, note, evidence_paths, status, created_at
      )
    `)
    .in('id', matchIds)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as MyMatch[]).filter((match) => isVisibleActivity(match.activity_type))
}

export async function confirmMatchResultRecord(input: {
  matchId: string
}): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('confirm-match-result', {
    body: { matchId: input.matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to confirm match result')
}

export type AcceptTeamResultRecordResult = {
  matchStatus: 'in_progress' | 'submitted' | 'verified' | 'settled'
  winnerUserId?: string | null
  isTie?: boolean
  accepted: number
  required: number
  settled: boolean
}

export async function acceptTeamResultRecord(input: {
  matchId: string
}): Promise<AcceptTeamResultRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<AcceptTeamResultRecordResult>(
    'accept-team-result',
    { body: { matchId: input.matchId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to accept team result')
  if (!data) throw new Error('accept-team-result returned no result')
  return data
}

export async function disputeMatchResultRecord(matchId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('dispute-match', {
    body: { matchId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to dispute match result')
}

export type StartMatchRecordResult = {
  matchStatus: 'in_progress'
  startedAt: string
}

export async function startMatchRecord(matchId: string): Promise<StartMatchRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<StartMatchRecordResult>(
    'start-match',
    { body: { matchId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to start match')
  if (!data?.matchStatus) throw new Error('start-match returned no status')
  return data
}

export type TeamResultCorrectionAction = 'request' | 'agree' | 'decline'

export async function requestTeamResultCorrectionRecord(
  matchId: string,
  action: TeamResultCorrectionAction,
): Promise<{ request_id: string; request_status: string; match_status: string }> {
  const { data, error } = await invokeAuthenticatedFunction<{
    request_id: string
    request_status: string
    match_status: string
  }>('request-team-result-correction', {
    body: { matchId, action },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update team result correction')
  if (!data) throw new Error('request-team-result-correction returned no data')
  return data
}
