import type { ReplayLngLat } from '@/lib/replay/replayPath'

export type ActivityReplayRouteSource = {
  activitySessionId: string
  userId: string
  startedAt: string | null
  endedAt: string | null
  points: ReplayLngLat[]
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
}

export type ActivityReplayRouteData = {
  matchId: string | null
  routes: ActivityReplayRouteSource[]
}
