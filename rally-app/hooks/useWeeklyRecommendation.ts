import { useMemo } from 'react'
import {
  DISCOVERY_FALLBACK_TIMEZONE,
  getWeekWindow,
} from '@/lib/discovery/weekWindow'
import {
  recommendWeeklyEvents,
  type RankedWeeklyEvent,
} from '@/lib/discovery/weeklyRecommendation'
import type { ChallengeListItem } from '@/types/challenge'

/**
 * Bridge from already-fetched open challenges to the ranked weekly
 * recommendation. Pure ranking lives in lib/discovery; this hook only supplies
 * the runtime context (now, device timezone, optional coordinates).
 */

export type WeeklyRecommendationResult = {
  /** Top-ranked event of the week, or null when nothing qualifies. */
  featured: RankedWeeklyEvent | null
  /** Remaining ranked events for this week. */
  others: RankedWeeklyEvent[]
}

const WEEKLY_TARGET_DISTANCE_KM = 5

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DISCOVERY_FALLBACK_TIMEZONE
  } catch {
    return DISCOVERY_FALLBACK_TIMEZONE
  }
}

export function useWeeklyRecommendation(
  challenges: ChallengeListItem[] | undefined,
  userCoords: { lat: number; lng: number } | null,
): WeeklyRecommendationResult {
  return useMemo(() => {
    if (!challenges || challenges.length === 0) return { featured: null, others: [] }
    const nowMs = Date.now()
    const ranked = recommendWeeklyEvents(challenges, {
      nowMs,
      week: getWeekWindow(nowMs, deviceTimeZone()),
      activity: 'running',
      targetDistanceKm: WEEKLY_TARGET_DISTANCE_KM,
      userCoords,
    })
    return { featured: ranked[0] ?? null, others: ranked.slice(1) }
  }, [challenges, userCoords])
}
