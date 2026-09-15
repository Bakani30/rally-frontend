/**
 * Single source of truth for the `activity_sessions` row shape returned to
 * the mobile app. Both `history` (list-by-user) and `detail` (single-by-id)
 * repositories project the same columns + nested relations, so the select
 * lives here to keep them in sync.
 *
 * If you add a column or relation, update {@link ActivityHistoryItem} in
 * `activityHistoryTypes.ts` to match.
 */
export const activitySessionSelect = `
  id,
  user_id,
  activity_type,
  source,
  status,
  visibility,
  title,
  notes,
  location_name,
  started_at,
  ended_at,
  duration_seconds,
  perceived_effort,
  mood_before,
  mood_after,
  context,
  reflection,
  verified_at,
  created_at,
  point_delta,
  running_activity_details (
    activity_session_id,
    distance_meters,
    moving_time_seconds,
    pace_seconds_per_km,
    best_pace_seconds_per_km,
    elevation_gain_meters,
    calories,
    avg_heart_rate,
    max_heart_rate,
    avg_cadence,
    steps,
    splits,
    route_summary,
    integrity_flags
  ),
  team_sport_activity_details (
    activity_session_id,
    format,
    team_size,
    side_0_score,
    side_1_score,
    winning_side,
    game_count,
    score_log,
    ruleset,
    court_or_field,
    stats
  ),
  activity_session_participants (
    id,
    activity_session_id,
    user_id,
    display_name,
    role,
    side,
    attendance_status,
    stats
  ),
  activity_session_media (
    id,
    activity_session_id,
    uploaded_by,
    media_type,
    storage_path,
    caption,
    captured_at
  ),
  activity_session_rating_snapshots (
    id,
    activity_session_id,
    user_id,
    rating_system,
    rating_before,
    rating_after,
    rating_delta,
    created_at
  )
`
