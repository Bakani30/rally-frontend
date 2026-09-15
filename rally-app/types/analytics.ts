import type {
  OfficialEventAnalyticsEvent,
  OfficialEventAnalyticsEventName,
} from '@rally/contracts'

export type AnalyticsEventName =
  | OfficialEventAnalyticsEventName
  | 'view_pro_waitlist'
  | 'tap_pro_locked_feature'
  | 'view_shop'
  | 'view_gift'
  | 'start_create_match'
  | 'complete_create_match'
  | 'invite_sent'
  | 'invite_referee'
  | 'invite_friend_failed'
  | 'invite_referee_failed'
  | 'referee_assignment_responded'
  | 'referee_assignment_response_failed'
  | 'invite_accepted'
  | 'stake_locked'
  | 'score_submitted'
  | 'result_confirmed'
  | 'match_settled'
  | 'dispute_opened'
  | 'match_entry_opened'
  | 'match_join_code_resolved'
  | 'match_join_completed'
  | 'view_profile'
  | 'view_leaderboard'
  | 'view_match_history'
  | 'set_featured_match'
  | 'drop_off_create_match_step'
  | 'create_match_validation_failed'
  | 'create_match_api_failed'
  | 'join_match_failed'
  | 'home_shortcut_tapped'
  | 'lobbies_screen_viewed'
  | 'gps_first_valid_point'
  | 'gps_searching_timeout'
  | 'run_permission_result'
  | 'run_permission_open_settings'
  | 'run_battery_opt_open_settings'
  | 'run_battery_opt_granted'
  | 'run_permission_lost_mid_run'
  | 'run_gps_lost'
  | 'run_pause_limit_reached'
  | 'running_insight_summary_viewed'
  | 'running_insight_improve_analysis_tapped'
  | 'analysis_profile_opened'
  | 'analysis_profile_saved'
  | 'player_role_changed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'run_share_card_opened'
  | 'run_share_metric_toggled'
  | 'run_share_sensitive_metrics_toggled'
  | 'run_share_card_exported'
  | 'run_share_card_export_failed'
  | 'tile_first_paint'
  | 'tile_provider_failover'
  | 'run_started'
  | 'run_submit_success'
  | 'run_submit_failed'
  | 'run_health_import_succeeded'
  | 'run_health_import_failed'
  | 'run_abandoned'
  | 'running_gate_locked'
  | 'score_submit_failed'
  | 'recap_moment_shown'
  | 'recap_moment_dismissed'
  | 'recap_action_tapped'
  | 'run_recap_moment_shown'
  | 'run_recap_action_tapped'
  | 'run_sync_dead_letter'
  | 'run_sync_manual_retry'
  | 'analysis_sheet_viewed'
  | 'map_quest_arrive'
  | 'map_quest_claim'
  | 'map_quest_abandon'
  | 'result_correction_request'
  | 'result_correction_agree'
  | 'result_correction_decline'
  | 'mutual_cancel_request'
  | 'mutual_cancel_agree'
  | 'mutual_cancel_decline'
  | 'result_escalate_admin'
  | 'quest_proof_hub_viewed'
  | 'quest_proof_quest_opened'
  | 'quest_proof_start_attempted'
  | 'quest_proof_start_succeeded'
  | 'quest_proof_start_failed'
  | 'quest_proof_capture_submitted'
  | 'quest_proof_result_viewed'
  | 'quest_proof_result_shared'
  | 'rank_promotion_moment_shown'
  | 'rank_frame_equipped'
  | 'rank_frame_locker_viewed'
  | 'run_summary_image_export_attempted'
  | 'run_summary_image_export_succeeded'
  | 'run_summary_image_export_failed'
  | 'run_summary_gpx_export_attempted'
  | 'run_summary_gpx_export_succeeded'
  | 'run_summary_gpx_export_failed'
  | 'run_replay_video_export_attempted'
  | 'run_replay_video_export_succeeded'
  | 'run_replay_video_export_failed'
  | 'run_replay_video_export_abandoned'
  | 'oauth_callback_exchange_failed'
  | 'quick_match_create'
  | 'quick_match_create_failed'
  | 'run_body_metrics_failed'
  | 'recap_body_viewed'
  | 'replay_glass_sheet_shown'
  | 'watermark_apply_succeeded'
  | 'watermark_apply_failed'
  | 'watermark_apply_abandoned'

export type AnalyticsEvent =
  | OfficialEventAnalyticsEvent
  | { name: 'view_pro_waitlist'; properties?: { source?: string } }
  | { name: 'tap_pro_locked_feature'; properties: { feature: string; surface: string } }
  | { name: 'view_shop'; properties?: { tab?: string } }
  | { name: 'view_gift'; properties: { gift_id: string } }
  | { name: 'start_create_match'; properties: { activity: 'running' | 'basketball' | 'badminton' } }
  | { name: 'complete_create_match'; properties: { match_id: string; activity: string; stake: number; participant_count: number } }
  | { name: 'invite_sent'; properties: { match_id: string } }
  | { name: 'invite_referee'; properties: { match_id: string; trust_tier: string; eligible: boolean } }
  | { name: 'invite_friend_failed'; properties: { reason: string } }
  | { name: 'invite_referee_failed'; properties: { reason: string } }
  | { name: 'referee_assignment_responded'; properties: { match_id: string; response: 'accept' | 'decline'; status: 'assigned' | 'declined' } }
  | { name: 'referee_assignment_response_failed'; properties: { match_id: string; response: 'accept' | 'decline'; reason: string } }
  | { name: 'invite_accepted'; properties: { match_id: string } }
  | { name: 'stake_locked'; properties: { match_id: string; amount: number } }
  | { name: 'score_submitted'; properties: { match_id: string } }
  | { name: 'result_confirmed'; properties: { match_id: string } }
  | { name: 'match_settled'; properties: { match_id: string; activity: string; total_stake: number; winner_count: number; loser_count: number } }
  | { name: 'dispute_opened'; properties: { match_id: string; reason?: string } }
  | { name: 'match_entry_opened'; properties: { source: string; has_code: boolean } }
  | { name: 'match_join_code_resolved'; properties: { source: string; match_id: string; activity: string; requires_entry_code: boolean } }
  | { name: 'match_join_completed'; properties: { source: string; match_id: string; entry_path: 'open_lobby' | 'join_code'; required_entry_code: boolean } }
  | { name: 'view_profile'; properties?: { is_self?: boolean } }
  | { name: 'view_leaderboard'; properties?: { scope?: 'global' | 'friends'; activity?: string } }
  | { name: 'view_match_history'; properties?: { filter?: string; is_self?: boolean } }
  | { name: 'set_featured_match'; properties: { match_id: string; action: 'set' | 'clear' | 'error' } }
  | { name: 'drop_off_create_match_step'; properties: { step: string; activity?: string } }
  | { name: 'create_match_validation_failed'; properties: { reason: string; activity?: string; step?: string } }
  | { name: 'create_match_api_failed'; properties: { reason: string; activity: string; join_mode: string; stake_currency: string; is_coop: boolean } }
  | { name: 'join_match_failed'; properties: { reason: string; source: string; entry_path: 'open_lobby' | 'join_code'; match_id?: string; required_entry_code?: boolean } }
  | { name: 'home_shortcut_tapped'; properties: { shortcut: 'lobby' | 'quest' | 'quests' | 'event' | 'guild' | 'referee' | 'rewards' } }
  | { name: 'lobbies_screen_viewed'; properties?: undefined }
  | { name: 'gps_first_valid_point'; properties: { latency_ms: number; accuracy_m: number } }
  | { name: 'gps_searching_timeout'; properties: { elapsed_ms: number } }
  | { name: 'run_permission_result'; properties: { foreground: 'granted' | 'denied' | 'unknown'; background: 'granted' | 'denied' | 'unknown' } }
  | { name: 'run_permission_open_settings'; properties?: undefined }
  | { name: 'run_battery_opt_open_settings'; properties?: undefined }
  | { name: 'run_battery_opt_granted'; properties?: undefined }
  | { name: 'run_permission_lost_mid_run'; properties: { has_match: boolean; has_challenge: boolean } }
  | { name: 'run_gps_lost'; properties: { has_match: boolean; has_challenge: boolean } }
  | { name: 'run_pause_limit_reached'; properties: { total_paused_seconds: number } }
  | { name: 'running_insight_summary_viewed'; properties: { source: string; has_route: boolean; route_point_count: number; summary_only_import: boolean; has_analysis_profile: boolean; credibility_card_count: number; story_card_count: number; history_card_count: number; stat_board_count: number; benchmark_comparison_count: number; benchmark_ready_count: number; run_history_count: number; coach_tip_count: number } }
  | { name: 'running_insight_improve_analysis_tapped'; properties: { surface: 'run_summary'; source: string; summary_only_import: boolean; has_analysis_profile: boolean } }
  | { name: 'analysis_profile_opened'; properties: { source: 'run_summary' | 'run_recap_gate' | 'settings' | 'direct'; has_existing_profile: boolean; completed_field_count: number } }
  | { name: 'analysis_profile_saved'; properties: { source: 'run_summary' | 'run_recap_gate' | 'settings' | 'direct'; completed_field_count: number; advanced_private_field_count: number; has_birth_date: boolean; has_competition_category: boolean; has_running_level: boolean; has_primary_goal: boolean; preferred_units: 'metric' | 'imperial' } }
  | { name: 'player_role_changed'; properties: { activity_type: string; position_key: string; source: 'settings' | 'direct' } }
  // Onboarding wizard: booleans only — never raw DOB/height/weight (private body data).
  | { name: 'onboarding_started'; properties?: undefined }
  | { name: 'onboarding_step_completed'; properties: { step: 1 | 2 | 3 | 4; step_key: 'welcome' | 'about_you' | 'sports' | 'experience' } }
  | { name: 'onboarding_completed'; properties: { sports: string[]; has_avatar: boolean; provided_height: boolean; provided_weight: boolean } }
  | { name: 'run_share_card_opened'; properties: { source: string; route_point_count: number; default_metric_count: number; sensitive_metric_count: number } }
  | { name: 'run_share_metric_toggled'; properties: { metric_id: string; selected: boolean; sensitivity: 'public_default' | 'explicit_sensitive'; selected_metric_count: number } }
  | { name: 'run_share_sensitive_metrics_toggled'; properties: { enabled: boolean; sensitive_metric_count: number } }
  | { name: 'run_share_card_exported'; properties: { method: 'save_image' | 'system_share'; asset_kind: 'photo' | 'video'; selected_metric_count: number; includes_sensitive_metrics: boolean; has_custom_background: boolean; source: string; route_point_count: number } }
  | { name: 'run_share_card_export_failed'; properties: { method: 'save_image' | 'system_share'; asset_kind: 'photo' | 'video'; reason: string; selected_metric_count: number; includes_sensitive_metrics: boolean; has_custom_background: boolean; source: string; route_point_count: number } }
  | { name: 'tile_first_paint'; properties: { provider_id: string; latency_ms: number } }
  | { name: 'tile_provider_failover'; properties: { from_provider: string; to_provider: string; reason: string } }
  | { name: 'run_started'; properties: { mode: 'solo' | 'coop' | 'ffa' | '1v1'; has_match: boolean; has_challenge: boolean } }
  | { name: 'run_submit_success'; properties: { mode: 'solo' | 'coop' | 'ffa' | '1v1'; has_match: boolean; distance_meters: number } }
  | { name: 'run_submit_failed'; properties: { mode: 'solo' | 'coop' | 'ffa' | '1v1'; has_match: boolean; reason: string } }
  | { name: 'run_health_import_succeeded'; properties: { source: 'healthkit' | 'health_connect'; has_match: boolean; has_challenge: boolean } }
  | { name: 'run_health_import_failed'; properties: { source: 'healthkit' | 'health_connect'; has_match: boolean; has_challenge: boolean; code: string } }
  | { name: 'run_abandoned'; properties: { status: 'idle' | 'active' | 'paused' | 'stopped'; has_match: boolean } }
  | { name: 'running_gate_locked'; properties?: undefined }
  | { name: 'score_submit_failed'; properties: { match_id: string; activity: string; reason: string } }
  | { name: 'recap_moment_shown'; properties: { match_id: string; activity: string; outcome: 'win' | 'lose' | 'tie'; tier_change: 'promote' | 'demote' | 'none' } }
  | { name: 'recap_moment_dismissed'; properties: { match_id: string; outcome: 'win' | 'lose' | 'tie' } }
  | { name: 'recap_action_tapped'; properties: { match_id: string; action: 'exit' | 'rematch' | 'view_analysis'; outcome: 'win' | 'lose' | 'tie' } }
  | { name: 'run_recap_moment_shown'; properties: { tone: 'record' | 'reward' | 'logged'; point_delta: number; has_pr: boolean; pr_kinds: string[]; has_splits: boolean } }
  | { name: 'run_recap_action_tapped'; properties: { action: 'details' | 'share' | 'home'; tone: 'record' | 'reward' | 'logged' } }
  | { name: 'run_sync_dead_letter'; properties: { code: string } }
  | { name: 'run_sync_manual_retry'; properties?: { code?: string } }
  | { name: 'analysis_sheet_viewed'; properties: { activity_session_id: string; has_pro: boolean } }
  | { name: 'map_quest_arrive'; properties: { spot_id: string; success: boolean; reason?: string } }
  | { name: 'map_quest_claim'; properties: { spot_id: string; success: boolean; points_granted?: number; reason?: string } }
  | { name: 'map_quest_abandon'; properties: { spot_id: string; dwell_remaining_s: number } }
  | { name: 'result_correction_request'; properties: { match_id: string } }
  | { name: 'result_correction_agree'; properties: { match_id: string } }
  | { name: 'result_correction_decline'; properties: { match_id: string } }
  | { name: 'mutual_cancel_request'; properties: { match_id: string } }
  | { name: 'mutual_cancel_agree'; properties: { match_id: string } }
  | { name: 'mutual_cancel_decline'; properties: { match_id: string } }
  | { name: 'result_escalate_admin'; properties: { match_id: string } }
  | { name: 'quest_proof_hub_viewed'; properties: { quest_count: number } }
  | { name: 'quest_proof_quest_opened'; properties: { verifier: string; lane: string } }
  | { name: 'quest_proof_start_attempted'; properties: { verifier: string; lane: string } }
  | { name: 'quest_proof_start_succeeded'; properties: { verifier: string } }
  | { name: 'quest_proof_start_failed'; properties: { verifier: string; code?: string } }
  | { name: 'quest_proof_capture_submitted'; properties: { verifier: string } }
  | { name: 'quest_proof_result_viewed'; properties: { tone: 'success' | 'capped' | 'fail' | 'pending' } }
  | { name: 'quest_proof_result_shared'; properties: { hasMedia: boolean } }
  | { name: 'rank_promotion_moment_shown'; properties: { activity: string; from_tier: string; to_tier: string } }
  | { name: 'rank_frame_equipped'; properties: { activity: string; tier: string; slot: 'frame'; success: boolean } }
  | { name: 'rank_frame_locker_viewed'; properties: { source: 'promotion_moment' | 'locker_tab' } }
  | { name: 'run_summary_image_export_attempted'; properties?: undefined }
  | { name: 'run_summary_image_export_succeeded'; properties?: undefined }
  | { name: 'run_summary_image_export_failed'; properties: { reason: string } }
  | { name: 'run_summary_gpx_export_attempted'; properties?: undefined }
  | { name: 'run_summary_gpx_export_succeeded'; properties?: undefined }
  | { name: 'run_summary_gpx_export_failed'; properties: { reason: string } }
  | { name: 'run_replay_video_export_attempted'; properties: { method: 'share_sheet' | 'save_video' | 'instagram_story' } }
  | { name: 'run_replay_video_export_succeeded'; properties: { method: 'share_sheet' | 'save_video' | 'instagram_story'; duration_ms: number } }
  | { name: 'run_replay_video_export_failed'; properties: { method: 'share_sheet' | 'save_video' | 'instagram_story'; reason: string } }
  | { name: 'run_replay_video_export_abandoned'; properties: { reason: string } }
  | { name: 'oauth_callback_exchange_failed'; properties?: undefined }
  | { name: 'quick_match_create'; properties: { match_id: string; stake: number; team_size: number } }
  | { name: 'quick_match_create_failed'; properties: { reason: string; stake: number; team_size: number } }
  | { name: 'run_body_metrics_failed'; properties: { reason: 'no_data' } }
  | { name: 'recap_body_viewed'; properties: { has_hr: boolean; intensity_level: string | null } }
  | { name: 'replay_glass_sheet_shown'; properties: { has_hr: boolean } }
  | { name: 'watermark_apply_succeeded'; properties: { domain: 'quest' | 'basketball_proof' | 'basketball_recap'; media: 'photo' | 'video' } }
  | { name: 'watermark_apply_failed'; properties: { domain: 'quest' | 'basketball_proof' | 'basketball_recap'; media: 'photo' | 'video'; reason: string } }
  | { name: 'watermark_apply_abandoned'; properties: { domain: 'quest' | 'basketball_proof' | 'basketball_recap'; media: 'photo' | 'video' } }

export type ServerEventName =
  | 'server_outcome_recorded'
  | 'invite_accepted'
  | 'stake_locked'
  | 'score_submitted'
  | 'result_confirmed'
  | 'match_settled'
  | 'dispute_opened'

export type ClientEvent = Extract<AnalyticsEvent, { name: Exclude<AnalyticsEventName, ServerEventName> }>
export type ServerEvent = Extract<AnalyticsEvent, { name: ServerEventName }>
