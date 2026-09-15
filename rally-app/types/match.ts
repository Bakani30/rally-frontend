export type JoinMode = 'invite' | 'open' | 'code' | 'private'
export type StakeCurrency = 'leaderboard_point' | 'credit'
export type PublicStakeCurrency = 'leaderboard_point'

export type MatchStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'verified'
  | 'settled'
  | 'disputed'
  | 'cancelled'

export type MatchSource = 'legacy_standalone' | 'arena_round'

export type VerificationMode = 'honor' | 'sensor' | 'community_vote'

export type Side = 0 | 1

export type Match = {
  id: string
  created_by: string
  activity_type: string
  rule_text: string | null
  rule_params: Record<string, unknown>
  stake: number
  stake_currency: StakeCurrency
  deadline: string
  status: MatchStatus
  winner_user_id: string | null
  is_tie: boolean
  verification_mode: VerificationMode
  team_size_per_side: number
  join_mode: JoinMode
  join_code: string | null
  entry_code: string | null
  created_at: string
  accepted_at: string | null
  started_at: string | null
  submitted_at: string | null
  settled_at: string | null
}

export type Participant = {
  match_id: string
  user_id: string
  role: string
  side: Side
  stake_contribution: number
  accepted_at: string | null
  joined_at: string
}

export type ParticipantUser = {
  id: string
  display_name: string | null
  email?: string
  handle?: string | null
  avatar_url?: string | null
  jersey_number?: number | null
  leaderboard_score?: number | null
}

export type MatchParticipant = {
  user_id: string
  side: Side
  stake_contribution: number
  accepted_at: string | null
  joined_at?: string | null
  is_active?: boolean
  rating_before: number | null
  rating_after: number | null
  lobby_position_key?: string | null
  users: ParticipantUser | null
}

export type ScoreLogPeriod = {
  period: number
  side_0: number
  side_1: number
  label?: string
}

export type TeamSportActivityDetails = {
  format: string | null
  team_size: number | null
  side_0_score: number | null
  side_1_score: number | null
  winning_side: 0 | 1 | null
  score_log: ScoreLogPeriod[] | null
}

export type ActivitySessionMedia = {
  storage_path: string
}

export type MatchSubmissionActivity = {
  id: string
  activity_type: string
  point_delta: number | null
  running_activity_details:
    | { distance_meters: number | null; moving_time_seconds: number | null; pace_seconds_per_km: number | null }
    | null
  team_sport_activity_details: TeamSportActivityDetails | null
  activity_session_media: ActivitySessionMedia[] | null
}

export type MatchParticipantContribution = {
  user_id: string
  points: number
  note: string | null
}

export type MatchTeamResultSubmission = {
  id: string
  side_index: Side
  submitted_by: string
  team_score: number
  notes: string | null
  proof_urls: string[]
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type AlphaRefereeActivity = 'running' | 'basketball' | 'badminton'
export type AlphaRefereeResultKind = 'team_score' | 'manual_running_result'
export type AlphaRefereeResultStatus = 'pending_player_action' | 'superseded' | 'cleared'
export type AlphaRefereeLiveScoreDraftStatus = 'open' | 'submitted' | 'correction_requested'

export type MatchRefereeAssignment = {
  id: string
  match_id: string
  referee_user_id: string
  activity_type: AlphaRefereeActivity
  assigned_by: string
  status: 'invited' | 'assigned' | 'declined' | 'removed'
  assigned_at: string
  updated_at: string
  referee?: ParticipantUser | null
}

export type AlphaRefereeResultSubmission = {
  id: string
  match_id: string
  assignment_id: string
  referee_user_id: string
  result_kind: AlphaRefereeResultKind
  side_0_score: number | null
  side_1_score: number | null
  winner_side: Side | null
  winner_user_id: string | null
  is_tie: boolean
  note: string | null
  proof_urls: string[]
  status: AlphaRefereeResultStatus
  created_at: string
  updated_at: string
  referee?: ParticipantUser | null
}

export type AlphaRefereePlayerStatDraft = {
  id: string
  draft_id: string
  match_id: string
  user_id: string
  side_index: Side
  points: number
  rebounds: number
  assists: number
  blocks: number
  three_pointers_made: number
  created_at: string
  updated_at: string
}

// Cumulative side totals + elapsed game time captured when the referee ends a
// quarter. Stored on the live-score draft so every device renders the same
// quarter breakdown.
export type AlphaRefereeQuarterBoundary = {
  side0: number
  side1: number
  elapsedMs: number
}

export type AlphaRefereeLiveScoreDraft = {
  id: string
  match_id: string
  assignment_id: string
  referee_user_id: string
  status: AlphaRefereeLiveScoreDraftStatus
  correction_note: string | null
  submitted_at: string | null
  correction_requested_at: string | null
  quarter_boundaries?: AlphaRefereeQuarterBoundary[] | null
  created_at: string
  updated_at: string
  player_stats?: AlphaRefereePlayerStatDraft[] | null
}

export type AlphaRefereeRunningMark = {
  id: string
  draft_id: string
  match_id: string
  participant_user_id: string | null
  side_index: Side
  mark_type: 'start' | 'checkpoint' | 'finish'
  checkpoint_index: number | null
  elapsed_ms: number
  recorded_at: string
  note: string | null
  created_at: string
  updated_at: string
}

export type AlphaRefereeRunningDraft = {
  id: string
  match_id: string
  assignment_id: string
  referee_user_id: string
  status: AlphaRefereeLiveScoreDraftStatus
  target_distance_meters: number | null
  correction_note: string | null
  started_at: string | null
  submitted_at: string | null
  correction_requested_at: string | null
  created_at: string
  updated_at: string
  marks?: AlphaRefereeRunningMark[] | null
}

export type BasketballPlayerStatDraft = {
  id: string
  match_id: string
  user_id: string
  side_index: Side
  points: number
  rebounds: number
  assists: number
  blocks: number
  three_pointers_made: number
  note: string | null
  created_at: string
  updated_at: string
}

export type PlayerScoreDraftBasketballStat = {
  userId: string
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export type PlayerScoreDraftBadmintonSet = {
  side0Score: number
  side1Score: number
}

export type PlayerScoreDraft = {
  id: string
  match_id: string
  activity_type: 'basketball' | 'badminton'
  side_index: Side
  submitted_by: string
  status: 'open' | 'submitted'
  team_score: number
  basketball_stats: PlayerScoreDraftBasketballStat[]
  badminton_sets: PlayerScoreDraftBadmintonSet[]
  note: string | null
  proof_urls: string[]
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type RefereeTrustTier =
  | 'candidate'
  | 'court_side'
  | 'community'
  | 'official_ready'
  | 'event_lead'

export type RefereeSportProfile = {
  user_id: string
  activity_type: 'basketball' | 'badminton'
  level: number
  trust_tier: RefereeTrustTier
  rating: number
  trust_score: number
  completed_matches: number
  referee_verified_matches: number
  clean_matches: number
  corrected_matches: number
  disputed_matches: number
  latest_match_id: string | null
  latest_settled_at: string | null
  created_at: string
  updated_at: string
}

export type RefereeMatchRecord = {
  id: string
  match_id: string
  assignment_id: string
  referee_user_id: string
  activity_type: 'basketball' | 'badminton'
  result_id: string
  final_status: 'accepted' | 'corrected' | 'disputed'
  correction_count: number
  had_dispute: boolean
  quality_delta: number
  referee_level_after: number
  trust_tier_after: RefereeTrustTier
  settled_at: string
  created_at: string
  updated_at: string
}

export type AlphaRefereeDutyResult = {
  id: string
  matchId: string
  assignmentId: string
  refereeUserId: string
  resultKind: AlphaRefereeResultKind
  side0Score: number | null
  side1Score: number | null
  winnerSide: Side | null
  winnerUserId: string | null
  isTie: boolean
  note: string | null
  proofUrls: string[]
  status: AlphaRefereeResultStatus
  createdAt: string
  updatedAt: string
}

export type AlphaRefereeDutyDraft = {
  id: string
  matchId: string
  assignmentId: string
  refereeUserId: string
  status: AlphaRefereeLiveScoreDraftStatus
  correctionNote: string | null
  submittedAt: string | null
  correctionRequestedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AlphaRefereeDuty = {
  assignmentId: string
  matchId: string
  refereeUserId: string
  activityType: AlphaRefereeActivity
  assignmentStatus: 'invited' | 'assigned'
  assignedAt: string
  updatedAt: string
  match: {
    id: string
    createdBy: string
    activityType: string
    ruleText: string | null
    ruleParams: Record<string, unknown>
    stake: number
    stakeCurrency: StakeCurrency
    status: MatchStatus
    deadline: string
    winnerUserId: string | null
    isTie: boolean
    isCoop: boolean
    teamSizePerSide: number
    acceptedAt: string | null
    startedAt: string | null
    submittedAt: string | null
    settledAt: string | null
    participants: Array<{
      userId: string
      side: Side
      isActive: boolean
      displayName: string | null
      handle: string | null
      avatarUrl: string | null
    }>
    teamResults: Array<{
      id: string
      sideIndex: Side
      submittedBy: string
      teamScore: number
      acceptedBy: string | null
      acceptedAt: string | null
      createdAt: string
      updatedAt: string
    }>
    submissions: Array<{
      id: string
      submittedBy: string
      winnerUserId: string | null
      createdAt: string
    }>
  }
  latestResult: AlphaRefereeDutyResult | null
  latestDraft?: AlphaRefereeDutyDraft | null
}

export type MatchSubmission = {
  id: string
  submitted_by: string
  winner_user_id: string | null
  created_at: string
  activity_session_id: string | null
  activity_sessions: MatchSubmissionActivity | null
}

export type MatchCancelRequest = {
  id: string
  requested_by: string
  responded_by: string | null
  status: 'pending' | 'agreed' | 'declined' | 'expired'
  requested_at: string
  responded_at: string | null
  expires_at: string
}

export type MatchTeamResultCorrectionRequest = {
  id: string
  match_id: string
  requested_by: string
  requested_side: 0 | 1
  status: 'pending' | 'agreed' | 'declined' | 'expired'
  responded_by: string | null
  created_at: string
  expires_at: string
  resolved_at: string | null
}

export type MatchResultCorrectionRequest = {
  id: string
  requested_by: string
  responded_by: string | null
  status: 'pending' | 'agreed' | 'declined' | 'expired'
  proposed_winner_side: 0 | 1 | null
  proposed_is_tie: boolean
  proposed_side_0_score: number | null
  proposed_side_1_score: number | null
  proposed_score_log: Array<{ period: number; side_0: number; side_1: number; label?: string }> | null
  requested_at: string
  responded_at: string | null
  expires_at: string
}

export type ProposedResultPayload = {
  side0Score?: number | null
  side1Score?: number | null
  winnerSide?: 0 | 1 | null
  isTie: boolean
  scoreLog?: Array<{ period: number; side_0: number; side_1: number; label?: string }> | null
}

export type MatchAbuseReportReason =
  | 'result_not_confirmed'
  | 'bad_faith_dispute'
  | 'team_result_incorrect'
  | 'abuse'
  | 'other'

export type MatchAbuseReport = {
  id: string
  match_id: string
  reporter_user_id: string
  reported_user_id: string | null
  reason: MatchAbuseReportReason
  note: string | null
  evidence_paths: string[]
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
}

export type MatchWithRelations = {
  id: string
  source: MatchSource | null
  created_by: string
  activity_type: string
  rule_text: string | null
  rule_params: Record<string, unknown>
  stake: number
  stake_currency: StakeCurrency
  deadline: string
  status: MatchStatus
  accepted_at: string | null
  started_at: string | null
  winner_user_id: string | null
  is_tie: boolean
  is_coop: boolean
  allow_spectators?: boolean | null
  team_size_per_side: number
  join_mode: JoinMode
  join_code: string | null
  entry_code: string | null
  match_participants: MatchParticipant[]
  match_invites?: MatchInvite[] | null
  match_submissions: MatchSubmission[]
  match_team_result_submissions?: MatchTeamResultSubmission[] | null
  match_referee_assignments?: MatchRefereeAssignment[] | MatchRefereeAssignment | null
  alpha_referee_result_submissions?: AlphaRefereeResultSubmission[] | AlphaRefereeResultSubmission | null
  alpha_referee_live_score_drafts?: AlphaRefereeLiveScoreDraft[] | AlphaRefereeLiveScoreDraft | null
  alpha_referee_running_drafts?: AlphaRefereeRunningDraft[] | AlphaRefereeRunningDraft | null
  basketball_player_stat_drafts?: BasketballPlayerStatDraft[] | BasketballPlayerStatDraft | null
  player_score_drafts?: PlayerScoreDraft[] | PlayerScoreDraft | null
  referee_match_records?: RefereeMatchRecord[] | RefereeMatchRecord | null
  match_cancel_requests?: MatchCancelRequest[] | null
  match_result_correction_requests?: MatchResultCorrectionRequest[]
  match_team_result_correction_requests?: MatchTeamResultCorrectionRequest[] | null
  match_participant_contributions?: MatchParticipantContribution[] | null
  match_abuse_reports?: MatchAbuseReport[] | null
}

export type MatchInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'

export type MatchInvite = {
  id: string
  match_id: string
  invitee_user_id: string
  inviter_user_id: string | null
  side: Side
  status: MatchInviteStatus
  sent_at: string
  responded_at: string | null
  invitee?: ParticipantUser | null
}

export type MyMatch = {
  id: string
  created_by: string
  activity_type: string
  rule_params?: Record<string, unknown> | null
  running_mode?: 'race' | 'coop' | 'ffa' | null
  stake: number
  stake_currency: StakeCurrency
  status: MatchStatus
  deadline: string
  winner_user_id: string | null
  is_tie: boolean
  is_coop: boolean
  updated_at: string
  /**
   * Set on every settle path (matches.settled_at). Optional because
   * list_my_matches_for_user does not return it yet — only the
   * listMatchesByIds fallback selects it.
   */
  settled_at?: string | null
  match_participants?: Array<Pick<MatchParticipant, 'user_id' | 'side' | 'is_active'>> | null
  match_team_result_submissions?: MatchTeamResultSubmission[] | null
  match_abuse_reports?: MatchAbuseReport[] | null
  trust_source?: 'referee_verified' | 'referee_score' | 'referee_assigned' | 'player_score_draft' | 'honor' | null
  trust_label?: string | null
  trust_weight?: number | null
  referee_level?: number | null
  referee_trust_tier?: RefereeTrustTier | null
  referee_final_status?: 'accepted' | 'corrected' | 'disputed' | null
}

export type MyPendingInvite = {
  inviteId: string
  matchId: string
  side: Side
  sentAt: string
  /** Why the invite was sent — drives the notification copy/chip. */
  kind: 'open' | 'challenge' | 'rematch'
  match: {
    activityType: string
    stake: number
    stakeCurrency: StakeCurrency
    isCoop: boolean
  }
  inviter: { id: string; displayName: string | null; handle: string | null; avatarUrl: string | null } | null
}

export type MatchLobby = {
  id: string
  /** Present when the discovery RPC exposes creation ordering. */
  created_at?: string
  created_by: string
  creator_display_name: string | null
  creator_handle: string | null
  activity_type: string
  stake: number
  stake_currency: StakeCurrency
  deadline: string
  team_size_per_side: number
  is_coop: boolean
  join_mode: JoinMode
  requires_entry_code: boolean
  side_a_count: number
  side_b_count: number
  rule_params?: Record<string, unknown> | null
  running_mode?: 'race' | 'coop' | 'ffa' | null
}

/** Route params carried from a finished match (or friend list) into /match/new. */
export type RematchParams = {
  /** Opponent @handle (1v1 only — omitted for team/FFA). */
  invite?: string
  /** Opponent display name, for the pre-filled invitee chip. */
  inviteName?: string
  /** Opponent user id, for the pre-filled invitee chip. */
  inviteUserId?: string
  /** Activity slug to pre-select. */
  activity?: string
  /** Stake to pre-fill (string; clamped on the screen). */
  stake?: string
  /** Team size per side to pre-fill. */
  teamSize?: string
  /** Id of the match this rematch derives from (analytics + H2H context). */
  rematchOf?: string
}

/** Head-to-head record between the current user and one opponent in one activity. */
export type HeadToHead = {
  wins: number
  losses: number
  draws: number
  /** ISO timestamp of the most recent settled match between them, or null. */
  lastPlayedAt: string | null
  /** 'win' | 'loss' | 'draw' for the most recent settled match, or null. */
  lastResult: 'win' | 'loss' | 'draw' | null
}
