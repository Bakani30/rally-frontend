// Quest Proof — shared types for the daily-quest proof flow.
// Session lifecycle + upload contract + quest catalog view models. Types only.
import type { QuestActivity } from '@/lib/daily-quests/questTypes'

export type QuestVerifier =
  | 'sensor_sync'
  | 'geofence'
  | 'timed_sensor'
  | 'capture_audit'
  // Phase B+ (not startable yet)
  | 'cv_make_miss'
  | 'cv_pose_reps'
  | 'cv_juggle'
  | 'cv_target_landing'

export type QuestLane = 'move' | 'explore' | 'practice'

export type QuestProofStatus =
  | 'live_session'
  | 'analyzing'
  | 'passed'
  | 'failed'
  | 'needs_review'
  | 'reward_pending'
  | 'claimed'
  | 'voided'
  | 'expired'

export type QuestAuditStatus = 'none' | 'queued' | 'passed' | 'failed'
export type QuestTrustDecision = 'instant' | 'pending'

export type QuestChallenge = {
  issued_at?: string
  expires_at?: string
  drill?: Record<string, unknown>
}

/** A row from quest_proof_sessions as returned by the quest-proof edge function. */
export type QuestProofSession = {
  id: string
  user_id: string
  template_id: string
  earn_period: string
  status: QuestProofStatus
  audit_status: QuestAuditStatus | null
  trust_decision: QuestTrustDecision | null
  points_granted: number | null
  nonce: string | null
  challenge: QuestChallenge | null
  sensor_summary: Record<string, unknown> | null
  media_path: string | null
  started_at: string | null
  completed_at: string | null
}

export type QuestMediaExt = 'jpg' | 'mp4'
export type QuestUploadContentType = 'image/jpeg' | 'video/mp4'

/** Supabase signed upload URL payload (server derives the storage path). */
export type SignedUploadTarget = {
  signedUrl: string
  token: string
  path: string
}

export type SubmitQuestProofInput = {
  sessionId: string
  sensorSummary?: Record<string, unknown>
  hasMedia: boolean
  mediaExt?: QuestMediaExt | null
}

// ── Quest catalog (quest_templates) ─────────────────────────────────────────

/** drill_spec jsonb across all 8 templates (loosely typed; varies by verifier). */
export type QuestDrillSpec = {
  kind?: string
  metric?: string
  drill?: string
  category?: string
  activity?: string
  media?: string
  target?:
    | number
    | {
        duration_s?: number
        attempts?: number
        makes?: number
        consecutive?: number
        time_limit_s?: number
      }
}

/** A row from quest_templates (client read, RLS: active only). */
export type QuestTemplateRow = {
  id: string
  slug: string
  activity: QuestActivity
  lane: QuestLane
  title: string
  subtitle: string | null
  icon: string | null
  verifier: QuestVerifier
  drill_spec: QuestDrillSpec | null
  proof_contract: Record<string, unknown> | null
  reward_points: number
  attempts_per_day: number
  is_active: boolean
}

/** Presentation-ready quest for the hub + detail (Thai copy derived from the row). */
export type QuestTemplateView = {
  templateId: string
  slug: string
  activity: QuestActivity
  lane: QuestLane
  verifier: QuestVerifier
  titleTH: string
  requirementTH: string
  ctaTH: string
  evidenceTH: string
  /** Short target label for the popup stat box, e.g. "เข้า 3 ลูก". Empty for sensor_sync/geofence. */
  targetTH: string
  rewardPoints: number
  attemptsPerDay: number
  accentColor: string
  icon: string
  /** time limit for capture quests / duration target for timed quests, in seconds. */
  timeLimitSeconds: number | null
  startable: boolean
  needsCapture: boolean
  /** capture mode for capture_audit quests (from drill_spec.media); null otherwise. */
  captureMedia: 'video' | 'image' | null
}
