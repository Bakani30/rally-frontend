import { haversineMeters } from '@/lib/run-tracking/gps/gpsDistance'
import { plannedRouteStartPoint } from '@/lib/maps/plannedRouteGeometry'
import { overlapsWeek, type WeekWindow } from '@/lib/discovery/weekWindow'
import type { Activity } from '@/lib/match/matchConfig'
import type { ChallengeListItem } from '@/types/challenge'

/**
 * Deterministic weekly event recommendation. Pure: receives time, week window,
 * preferences, optional user coordinates, and candidates explicitly — never
 * reads the clock, device location, React, or Supabase. Ranking components are
 * named and individually testable; no opaque magic score.
 */

export type RecommendationReason =
  | 'this_week'
  | 'exact_distance'
  | 'near_distance'
  | 'official_route'
  | 'nearby'
  | 'featured_campaign'

export type WeeklyRecommendationContext = {
  nowMs: number
  week: WeekWindow
  activity: Activity
  /** Preferred target distance in km (e.g. 5). Null disables distance ranking. */
  targetDistanceKm: number | null
  /** Foreground-location coordinates; never persisted by this module. */
  userCoords?: { lat: number; lng: number } | null
  /** Events farther than this are still listed but not labelled "nearby". */
  maxTravelKm?: number | null
}

export type RankedWeeklyEvent = {
  challenge: ChallengeListItem
  reasons: RecommendationReason[]
  /** Distance from user to the official route start; null unless both coordinates are valid. */
  distanceFromUserKm: number | null
  isExactDistance: boolean
  hasOfficialRoute: boolean
}

const NEARBY_DEFAULT_MAX_KM = 15

function toMs(iso: string): number {
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function isEligible(challenge: ChallengeListItem, context: WeeklyRecommendationContext): boolean {
  if (challenge.status !== 'active' && challenge.status !== 'scheduled') return false
  if (challenge.activity_type !== context.activity) return false
  const startMs = toMs(challenge.start_at)
  const endMs = toMs(challenge.end_at)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false
  if (endMs <= context.nowMs) return false
  return overlapsWeek(startMs, endMs, context.week)
}

/** |goal − target| in km; Infinity when the goal is not a distance goal. */
function distanceDiffKm(challenge: ChallengeListItem, targetKm: number | null): number {
  if (targetKm == null || challenge.goal_type !== 'distance_km') return Infinity
  if (!Number.isFinite(challenge.goal_value)) return Infinity
  return Math.abs(challenge.goal_value - targetKm)
}

function distanceFromUserKm(
  challenge: ChallengeListItem,
  userCoords: { lat: number; lng: number } | null | undefined,
): number | null {
  if (!userCoords) return null
  const start = plannedRouteStartPoint(challenge.planned_route_geojson)
  if (!start) return null
  const meters = haversineMeters(userCoords, start)
  return Number.isFinite(meters) ? meters / 1000 : null
}

function compareRanked(a: RankedWeeklyEvent, b: RankedWeeklyEvent, ctx: {
  diffA: number
  diffB: number
}): number {
  // 1. Exact target-distance match wins.
  if (a.isExactDistance !== b.isExactDistance) return a.isExactDistance ? -1 : 1
  // 2. Smaller distance difference.
  if (ctx.diffA !== ctx.diffB) return ctx.diffA < ctx.diffB ? -1 : 1
  // 3. Official planned route present.
  if (a.hasOfficialRoute !== b.hasOfficialRoute) return a.hasOfficialRoute ? -1 : 1
  // 4. Nearest event when user coordinates are available (null last).
  const nearA = a.distanceFromUserKm
  const nearB = b.distanceFromUserKm
  if (nearA != null || nearB != null) {
    if (nearA == null) return 1
    if (nearB == null) return -1
    if (nearA !== nearB) return nearA < nearB ? -1 : 1
  }
  // 5. Featured campaign priority.
  const featuredA = !!a.challenge.campaign_id
  const featuredB = !!b.challenge.campaign_id
  if (featuredA !== featuredB) return featuredA ? -1 : 1
  // 6. Larger participant count.
  if (a.challenge.participant_count !== b.challenge.participant_count) {
    return b.challenge.participant_count - a.challenge.participant_count
  }
  // 7. Stable final tie-breakers: earlier start, then id.
  const startA = toMs(a.challenge.start_at)
  const startB = toMs(b.challenge.start_at)
  if (startA !== startB) return startA < startB ? -1 : 1
  return a.challenge.id < b.challenge.id ? -1 : a.challenge.id > b.challenge.id ? 1 : 0
}

/**
 * Rank eligible candidates for the selected week. Does not mutate
 * `candidates`. Equal-score ordering is stable across runs.
 */
export function recommendWeeklyEvents(
  candidates: readonly ChallengeListItem[],
  context: WeeklyRecommendationContext,
): RankedWeeklyEvent[] {
  const maxTravelKm = context.maxTravelKm ?? NEARBY_DEFAULT_MAX_KM

  const ranked = candidates
    .filter((challenge) => isEligible(challenge, context))
    .map((challenge): RankedWeeklyEvent & { _diff: number } => {
      const diff = distanceDiffKm(challenge, context.targetDistanceKm)
      const isExactDistance = diff === 0
      const hasOfficialRoute = plannedRouteStartPoint(challenge.planned_route_geojson) != null
      const fromUserKm = distanceFromUserKm(challenge, context.userCoords)

      const reasons: RecommendationReason[] = ['this_week']
      if (isExactDistance) reasons.push('exact_distance')
      else if (Number.isFinite(diff)) reasons.push('near_distance')
      if (hasOfficialRoute) reasons.push('official_route')
      if (fromUserKm != null && fromUserKm <= maxTravelKm) reasons.push('nearby')
      if (challenge.campaign_id) reasons.push('featured_campaign')

      return {
        challenge,
        reasons,
        distanceFromUserKm: fromUserKm,
        isExactDistance,
        hasOfficialRoute,
        _diff: diff,
      }
    })

  ranked.sort((a, b) => compareRanked(a, b, { diffA: a._diff, diffB: b._diff }))
  return ranked.map(({ _diff, ...event }) => event)
}
