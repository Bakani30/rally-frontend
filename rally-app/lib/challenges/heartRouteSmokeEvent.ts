import type { ChallengeDetail, ChallengeListItem, ChallengeParticipant } from '@/types/challenge'
import { createHeartRouteGeoJson } from '@/lib/run-tracking/routes/heartRouteFixture'

export const HEART_ROUTE_SMOKE_CHALLENGE_ID = '00000000-0000-4000-8000-000000000042'
export const HEART_ROUTE_SMOKE_REWARD_POINTS = 120

const HEART_ROUTE_GEOJSON = createHeartRouteGeoJson()
const HEART_ROUTE_START = '2026-06-04T00:00:00.000Z'
const HEART_ROUTE_END = '2026-12-31T23:59:59.000Z'
const FALLBACK_USER_ID = 'heart-route-smoke-runner'

export function isHeartRouteSmokeChallengeId(id: string | undefined | null): boolean {
  return id === HEART_ROUTE_SMOKE_CHALLENGE_ID
}

export function shouldShowHeartRouteSmokeEvent(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function getHeartRouteSmokeChallengeListItem(
  currentUserId: string | undefined,
): ChallengeListItem {
  return {
    ...baseHeartRouteChallenge(currentUserId),
    participant_count: 1,
    is_joined: true,
  }
}

export function getHeartRouteSmokeChallengeDetail(
  id: string | undefined,
  currentUserId: string | undefined,
): ChallengeDetail | null {
  if (!isHeartRouteSmokeChallengeId(id)) return null

  const userId = currentUserId ?? FALLBACK_USER_ID
  const participant: ChallengeParticipant = {
    challenge_id: HEART_ROUTE_SMOKE_CHALLENGE_ID,
    user_id: userId,
    joined_at: HEART_ROUTE_START,
    progress: 0,
    completed_at: null,
    reward_claimed_at: null,
    users: {
      display_name: 'Heart Runner',
      handle: 'heart_route',
    },
  }

  return {
    ...baseHeartRouteChallenge(currentUserId),
    participants: [participant],
    progress_summary: {
      challenge_id: HEART_ROUTE_SMOKE_CHALLENGE_ID,
      challenge_mode: 'solo',
      goal_type: 'custom',
      goal_value: 1,
      has_planned_route: true,
      participant_count: 1,
      team_progress: 0,
      progress_ratio: 0,
      completed_participants: 0,
      participants_at_goal: 0,
      team_completed: false,
    },
  }
}

function baseHeartRouteChallenge(currentUserId: string | undefined) {
  return {
    id: HEART_ROUTE_SMOKE_CHALLENGE_ID,
    creator_id: currentUserId ?? FALLBACK_USER_ID,
    title: 'Heart Route Smoke',
    description:
      'วิ่งทับเส้นหัวใจให้ครบ เส้นเทาคือ route ที่กำหนด และรางวัลของ event นี้จะปลดล็อกเมื่อ route ผ่าน ไม่ได้อิงแต้ม solo run',
    activity_type: 'running' as const,
    goal_type: 'custom' as const,
    goal_value: 1,
    challenge_mode: 'solo' as const,
    start_at: HEART_ROUTE_START,
    end_at: HEART_ROUTE_END,
    max_participants: 1,
    status: 'active' as const,
    created_at: HEART_ROUTE_START,
    reward_points: HEART_ROUTE_SMOKE_REWARD_POINTS,
    planned_route_geojson: HEART_ROUTE_GEOJSON,
    route_tolerance_m: 8,
    campaign_id: null,
    campaigns: null,
  }
}
