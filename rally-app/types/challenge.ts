import type { Activity } from '@/lib/match/matchConfig'
import type { CampaignSkin, PartnerCampaignCard } from '@rally/contracts'

export type ChallengeStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled'
export type ChallengeGoalType = 'distance_km' | 'sessions' | 'minutes' | 'custom'
export type ChallengeMode = 'solo' | 'cooperative'

export type Challenge = {
  id: string
  creator_id: string
  campaign_id?: string | null
  campaigns?: {
    id: string
    slug: string
    title: string
    short_prompt: string
    skin: CampaignSkin
    partner_cards: PartnerCampaignCard[]
    partner_name: string | null
  } | null
  title: string
  description: string
  activity_type: Activity
  goal_type: ChallengeGoalType
  goal_value: number
  challenge_mode?: ChallengeMode
  start_at: string
  end_at: string
  max_participants: number | null
  status: ChallengeStatus
  created_at: string
  reward_points?: number | null
  planned_route_geojson?: { type: 'LineString'; coordinates: [number, number][] } | null
  route_tolerance_m?: number | null
}

export type ChallengeRewardKind = 'points' | 'cosmetic' | 'voucher'

export type ChallengeRewardClaim =
  | {
      challengeId: string
      kind: 'points'
      amount: number
      scoreAwarded: number
      scoreAfter: number | null
      balanceAfter: number
      spendableAfter: number
      currency: 'leaderboard_point'
    }
  | {
      challengeId: string
      kind: 'cosmetic'
      cosmeticId: string
    }
  | {
      challengeId: string
      kind: 'voucher'
      voucherId: string
      shortCode: string
      expiresAt: string | null
    }

export type RouteMatchVerification = {
  attemptId: string
  alreadyExists: boolean
  bestMatchScore: number | null
  bestSessionId: string | null
  progress: number
  challengeCompleted: boolean
  match: {
    withinToleranceRatio: number
    lengthCoverage: number
    waypointOrderScore: number
    matchScore: number
    passed: boolean
    diagnostics: {
      pointsTotal: number
      pointsWithinTolerance: number
      coveredSegments: number
      totalSegments: number
      outOfBoundsExcursionCount: number
      longestExcursionMeters: number
      /** Phase 3.5 directionality. Optional for forward compatibility. */
      waypointCount?: number
      waypointMatched?: number
      waypointLis?: number
    }
  }
}

export type ChallengeListItem = Challenge & {
  participant_count: number
  is_joined: boolean
}

/** A single past attempt on a route challenge. Server-derived from challenge_route_attempts. */
export type RouteAttempt = {
  attemptId: string
  activitySessionId: string
  matchScore: number
  passed: boolean
  attemptedAt: string
  diagnostics: Record<string, unknown>
}

export type RouteAttemptHistory = {
  challengeId: string
  attempts: RouteAttempt[]
  bestMatchScore: number | null
}

export type ChallengeParticipant = {
  challenge_id: string
  user_id: string
  joined_at: string
  progress: number
  completed_at: string | null
  reward_claimed_at?: string | null
  users: {
    display_name: string
    handle: string | null
  } | null
}

export type ChallengeProgressSummary = {
  challenge_id: string
  challenge_mode: ChallengeMode
  goal_type: ChallengeGoalType
  goal_value: number
  has_planned_route: boolean
  participant_count: number
  team_progress: number
  progress_ratio: number
  completed_participants: number
  participants_at_goal: number
  team_completed: boolean
}

export type ChallengeDetail = Challenge & {
  participants: ChallengeParticipant[]
  progress_summary?: ChallengeProgressSummary | null
}

export type CreateChallengeInput = {
  title: string
  description: string
  activity_type: Activity
  goal_type: ChallengeGoalType
  goal_value: number
  challenge_mode?: ChallengeMode
  end_at: string
  max_participants?: number | null
  start_at?: string | null
}
