export type ArenaActivity = 'basketball' | 'badminton'
export type ArenaJoinMode = 'open' | 'code' | 'private'
export type ArenaEventStatus = 'open' | 'paused' | 'closed' | 'cancelled'
export type ArenaTeamStatus =
  | 'forming'
  | 'queued'
  | 'on_deck'
  | 'active'
  | 'champion'
  | 'retired'
  | 'disputed'
  | 'removed'
export type ArenaRoundStatus =
  | 'stake_acceptance'
  | 'in_progress'
  | 'result_pending'
  | 'disputed'
  | 'settled'
  | 'cancelled'
export type ArenaRefereeStatus = 'invited' | 'active' | 'declined' | 'removed'
export type ArenaDisputeStatus = 'open' | 'resolved' | 'escalated'

export type ArenaUser = {
  id: string
  display_name: string | null
  handle?: string | null
  avatar_url?: string | null
  leaderboard_score?: number | null
}

export type ArenaTeamMember = {
  arena_team_id: string
  arena_id: string
  user_id: string
  accepted_at: string | null
  is_active: boolean
  created_at: string
  users?: ArenaUser | null
}

export type ArenaTeam = {
  id: string
  arena_id: string
  leader_user_id: string
  name: string
  color_key: string
  icon_key: string
  status: ArenaTeamStatus
  queue_position: number | null
  current_streak: number
  best_streak: number
  wins: number
  losses: number
  points_for: number
  points_against: number
  ready_at: string | null
  created_at: string
  updated_at: string
  leader?: ArenaUser | null
  arena_team_members?: ArenaTeamMember[] | null
}

export type ArenaReferee = {
  arena_id: string
  user_id: string
  status: ArenaRefereeStatus
  rotation_index: number
  accepted_at: string | null
  created_at: string
  users?: ArenaUser | null
}

export type ArenaRoundDispute = {
  id: string
  round_id: string
  reporter_user_id: string
  reason: string
  status: ArenaDisputeStatus
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  reporter?: ArenaUser | null
}

export type ArenaRound = {
  id: string
  arena_id: string
  match_id: string
  champion_team_id: string
  challenger_team_id: string
  referee_user_id: string | null
  champion_stake_per_player: number
  challenger_stake_per_player: number
  status: ArenaRoundStatus
  rule_snapshot: Record<string, unknown>
  started_at: string | null
  submitted_at: string | null
  dispute_deadline_at: string | null
  settled_at: string | null
  winner_team_id: string | null
  loser_team_id: string | null
  champion_score: number | null
  challenger_score: number | null
  created_at: string
  updated_at: string
  referee?: ArenaUser | null
  arena_round_disputes?: ArenaRoundDispute[] | null
}

export type ArenaEvent = {
  id: string
  created_by: string
  title: string
  activity_type: ArenaActivity
  team_size_per_side: number
  join_mode: ArenaJoinMode
  join_code: string | null
  entry_code: string | null
  rule_text: string
  target_score: number
  time_limit_seconds: number
  base_stake_per_player: number
  streak_increment_per_player: number
  max_streak: number
  status: ArenaEventStatus
  current_champion_team_id: string | null
  current_champion_streak: number
  created_at: string
  updated_at: string
  session_context?: {
    source_kind: 'ad_hoc' | 'venue'
    mode: 'casual' | 'conquest'
  } | null
  creator?: ArenaUser | null
  arena_teams?: ArenaTeam[] | null
  arena_referees?: ArenaReferee[] | null
  arena_rounds?: ArenaRound[] | null
}

export type ArenaCreateInput = {
  title: string
  activityType: ArenaActivity
  teamSizePerSide?: number
  joinMode?: ArenaJoinMode
  entryCode?: string | null
  ruleText?: string | null
  targetScore?: number | null
  timeLimitSeconds?: number | null
}

export type ArenaTeamCreateInput = {
  arenaId: string
  name: string
  colorKey?: string
  iconKey?: string
  memberUserIds?: string[]
}

export type ArenaActionOutput = {
  arenaId: string
  roundId?: string | null
  matchId?: string | null
  result?: Record<string, unknown>
  arena?: ArenaEvent | null
}
