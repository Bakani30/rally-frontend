export type ActivitySessionStatus = 'draft' | 'recorded' | 'submitted' | 'verified' | 'rejected'
export type ActivityVisibility = 'private' | 'participants' | 'friends' | 'public'
export type ActivityMediaType =
  | 'photo'
  | 'video'
  | 'gps_track'
  | 'heart_rate_series'
  | 'scoreboard'
  | 'other'

export type ActivitySession = {
  id: string
  user_id: string
  activity_type: string
  source: string
  status: ActivitySessionStatus
  visibility: ActivityVisibility
  title: string | null
  notes: string | null
  location_name: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  perceived_effort: number | null
  mood_before: number | null
  mood_after: number | null
  context: Record<string, unknown>
  reflection: Record<string, unknown>
  verified_at: string | null
  created_at: string
  point_delta: number | null
}

export type ActivitySessionRatingSnapshot = {
  id: string
  activity_session_id: string
  user_id: string
  rating_system: string
  rating_before: number
  rating_after: number
  rating_delta: number
  created_at: string
}

export type RunningActivityDetails = {
  activity_session_id: string
  distance_meters: number | null
  moving_time_seconds: number | null
  pace_seconds_per_km: number | null
  best_pace_seconds_per_km: number | null
  elevation_gain_meters: number | null
  calories: number | null
  avg_heart_rate: number | null
  max_heart_rate: number | null
  avg_cadence: number | null
  steps: number | null
  splits: unknown[]
  route_summary: Record<string, unknown>
  integrity_flags: unknown[]
}

export type TeamSportActivityDetails = {
  activity_session_id: string
  format: string
  team_size: number | null
  side_0_score: number | null
  side_1_score: number | null
  winning_side: 0 | 1 | null
  game_count: number | null
  score_log: unknown[]
  ruleset: Record<string, unknown>
  court_or_field: string | null
  stats: Record<string, unknown>
}

export type ActivityParticipant = {
  id: string
  activity_session_id: string
  user_id: string | null
  display_name: string | null
  role: string
  side: number | null
  attendance_status: string
  stats: Record<string, unknown>
}

export type ActivityMedia = {
  id: string
  activity_session_id: string
  uploaded_by: string
  media_type: ActivityMediaType
  storage_path: string
  caption: string | null
  captured_at: string | null
}

export type ActivityHistoryItem = ActivitySession & {
  running_activity_details: RunningActivityDetails | null
  team_sport_activity_details: TeamSportActivityDetails | null
  activity_session_participants: ActivityParticipant[]
  activity_session_media: ActivityMedia[]
  activity_session_rating_snapshots: ActivitySessionRatingSnapshot[]
}
