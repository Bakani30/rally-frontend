import { describe, expect, it } from 'vitest'

import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'

import { buildRunInsightInputFromActivity } from './runInsightActivityMapper'
import { buildRunInsightSummary } from './runInsightEngine'

describe('buildRunInsightInputFromActivity', () => {
  it('maps activity details, route points, splits, and profile context into insight input', () => {
    const activity = makeRunActivity({
      source: 'gps_live',
      routePath: [gpsPoint(1), gpsPoint(2), gpsPoint(3)],
      splits: [
        { km: 1, timeSeconds: 300, paceSecondsPerKm: 300 },
        { km: 2, timeSeconds: 620, paceSecondsPerKm: 320 },
      ],
      avgHeartRate: 150,
    })
    const profile: AnalysisProfile = {
      userId: 'user-1',
      birthYear: 1994,
      birthDate: null,
      competitionCategory: 'open',
      heightCm: null,
      weightKg: null,
      runningLevel: 'casual',
      primaryGoal: 'half_marathon',
      preferredUnits: 'metric',
      createdAt: null,
      updatedAt: null,
    }

    const input = buildRunInsightInputFromActivity(activity, profile)

    expect(input.source).toBe('gps_live')
    expect(input.pathPointCount).toBe(3)
    expect(input.routeQuality?.status).toBe('limited')
    expect(input.routeQuality?.issues).toContain('sparse_points')
    expect(input.splits).toHaveLength(2)
    expect(input.avgHeartRate).toBe(150)
    expect(input.profile?.birthYear).toBe(1994)
    expect(input.profile?.competitionCategory).toBe('open')
    expect(input.profile?.primaryGoal).toBe('half_marathon')
  })

  it('keeps summary-only health imports valid and surfaces route-level fallback copy', () => {
    const activity = makeRunActivity({
      source: 'healthkit',
      routePath: [],
      splits: [],
      integrityFlags: ['external_health_source'],
    })

    const summary = buildRunInsightSummary(buildRunInsightInputFromActivity(activity, null))

    expect(summary.credibilityCards.map((card) => card.id)).toContain('summary-only')
    expect(summary.storyCards.map((card) => card.id)).toContain('solid-summary')
  })

  it('generates valid insight input without an analysis profile', () => {
    const activity = makeRunActivity({ source: 'health_connect', routePath: [] })

    const input = buildRunInsightInputFromActivity(activity)

    expect(input.profile).toBeNull()
    expect(input.source).toBe('health_connect')
    expect(input.distanceMeters).toBe(5000)
  })
})

function makeRunActivity({
  source,
  routePath = [gpsPoint(1), gpsPoint(2)],
  splits = [{ km: 1, timeSeconds: 300, paceSecondsPerKm: 300 }],
  integrityFlags = [],
  avgHeartRate = null,
}: {
  source: string
  routePath?: GpsPoint[]
  splits?: unknown[]
  integrityFlags?: unknown[]
  avgHeartRate?: number | null
}): ActivityHistoryItem {
  return {
    id: 'session-1',
    user_id: 'user-1',
    activity_type: 'running',
    source,
    status: 'recorded',
    visibility: 'private',
    title: null,
    notes: null,
    location_name: null,
    started_at: '2026-05-14T00:00:00.000Z',
    ended_at: '2026-05-14T00:25:00.000Z',
    duration_seconds: 1500,
    perceived_effort: 7,
    mood_before: null,
    mood_after: null,
    context: {},
    reflection: {},
    verified_at: null,
    created_at: '2026-05-14T00:25:00.000Z',
    point_delta: null,
    running_activity_details: {
      activity_session_id: 'session-1',
      distance_meters: 5000,
      moving_time_seconds: 1500,
      pace_seconds_per_km: 300,
      best_pace_seconds_per_km: 290,
      elevation_gain_meters: 12,
      calories: null,
      avg_heart_rate: avgHeartRate,
      max_heart_rate: null,
      avg_cadence: null,
      steps: null,
      splits,
      route_summary: { path: routePath },
      integrity_flags: integrityFlags,
    },
    team_sport_activity_details: null,
    activity_session_participants: [],
    activity_session_media: [],
    activity_session_rating_snapshots: [],
  }
}

function gpsPoint(index: number): GpsPoint {
  return {
    lat: 13 + index * 0.001,
    lng: 100 + index * 0.001,
    accuracy: 8,
    timestamp: 1_768_000_000_000 + index * 1000,
    isPaused: false,
  }
}
