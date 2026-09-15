import { RallyPalette } from '@/constants/theme'
import {
  buildReplayTrack,
  offsetCoordinate,
  preparePath,
  revealedCoordinatesAtProgress,
  sampleAtProgress,
  type ReplayLngLat,
  type ReplayTrack,
} from '@/lib/replay/replayPath'
import type { ReplayMapCompanion } from '@/lib/replay/replayMapTypes'
import type { ActivityReplayRouteSource } from './activityReplayRouteTypes'

const COMPANION_COLORS = [RallyPalette.red, RallyPalette.orange, RallyPalette.teal, RallyPalette.amber]
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function replayMarkerInitials(displayName: string | null, handle: string | null): string {
  const source = (displayName?.trim() || handle?.trim() || 'R').trim()
  const tokens = source.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
  return (tokens[0]?.slice(0, 2) || 'R').toUpperCase()
}

type ReplaySessionTiming = {
  startedAt: string | null
  endedAt: string | null
}

function dateMs(value: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function progressForCompanion(
  primaryTiming: ReplaySessionTiming,
  companionTiming: ReplaySessionTiming,
  replayProgress: number,
): number {
  const primaryStart = dateMs(primaryTiming.startedAt)
  const primaryEnd = dateMs(primaryTiming.endedAt)
  const companionStart = dateMs(companionTiming.startedAt)
  const companionEnd = dateMs(companionTiming.endedAt)
  const primaryDuration = primaryStart != null && primaryEnd != null ? primaryEnd - primaryStart : 0
  const companionDuration = companionStart != null && companionEnd != null ? companionEnd - companionStart : 0

  if (primaryDuration <= 0 || companionDuration <= 0 || primaryStart == null || companionStart == null) {
    return clamp01(replayProgress)
  }

  const replayTime = primaryStart + clamp01(replayProgress) * primaryDuration
  return clamp01((replayTime - companionStart) / companionDuration)
}

function buildCompanionTrack(points: ReplayLngLat[]): ReplayTrack | null {
  const prepared = preparePath(points, { toleranceMeters: 4, smoothRadius: 1 })
  if (prepared.length < 2) return null
  const track = buildReplayTrack(prepared)
  return track.totalMeters > 0 ? track : null
}

export type PreparedReplayMapCompanion = {
  id: string
  track: ReplayTrack
  fullCoordinates: [number, number][]
  source: ActivityReplayRouteSource
  color: string
}

function toPreparedCompanion(
  source: ActivityReplayRouteSource,
  color: string,
): PreparedReplayMapCompanion | null {
  const track = buildCompanionTrack(source.points)
  if (!track) return null
  return {
    id: source.userId || source.activitySessionId,
    track,
    fullCoordinates: track.points.map((point) => [point.lng, point.lat]),
    source,
    color,
  }
}

function toCompanion(
  prepared: PreparedReplayMapCompanion,
  primaryTiming: ReplaySessionTiming,
  replayProgress: number,
): ReplayMapCompanion {
  const { source, track } = prepared

  const companionProgress = progressForCompanion(primaryTiming, source, replayProgress)
  const sample = sampleAtProgress(track, companionProgress)
  return {
    id: prepared.id,
    fullCoordinates: prepared.fullCoordinates,
    revealedCoordinates: revealedCoordinatesAtProgress(track, companionProgress),
    revealedProgress: companionProgress,
    marker: { lat: sample.lat, lng: sample.lng },
    color: prepared.color,
    markerAvatarUrl: source.avatarUrl,
    markerInitials: replayMarkerInitials(source.displayName, source.handle),
  }
}

function createSimulatorCompanionRoute(primaryTrack: ReplayTrack): ReplayLngLat[] {
  return primaryTrack.points.map((point, index) => {
    const weave = Math.sin(index * 0.65) * 3
    return offsetCoordinate(point.lng, point.lat, 55, 26 + weave)
  })
}

/**
 * Prepares provider-neutral companion geometry. `useFixture` is intentionally
 * explicit and is only enabled by the replay screen in development builds so
 * simulator testing does not fabricate production route data.
 */
export function prepareReplayMapCompanions(input: {
  primarySessionId: string
  primaryUserId: string
  primaryTrack: ReplayTrack
  sources: ActivityReplayRouteSource[]
  useFixture?: boolean
}): PreparedReplayMapCompanion[] {
  const realCompanions = input.sources
    .filter((source) => source.activitySessionId !== input.primarySessionId && source.userId !== input.primaryUserId)
    .map((source, index) => toPreparedCompanion(
      source,
      COMPANION_COLORS[index % COMPANION_COLORS.length],
    ))
    .filter((companion): companion is PreparedReplayMapCompanion => companion !== null)

  if (realCompanions.length > 0 || !input.useFixture || input.primaryTrack.points.length < 2) {
    return realCompanions
  }

  const fixture = toPreparedCompanion({
    activitySessionId: 'simulator-companion-session',
    userId: 'simulator-companion',
    startedAt: null,
    endedAt: null,
    points: createSimulatorCompanionRoute(input.primaryTrack),
    displayName: 'Rally Rival',
    handle: 'simulator',
    avatarUrl: null,
  }, RallyPalette.red)
  return fixture ? [fixture] : []
}

export function revealReplayMapCompanions(input: {
  primaryTiming: ReplaySessionTiming
  prepared: PreparedReplayMapCompanion[]
  replayProgress: number
}): ReplayMapCompanion[] {
  return input.prepared.map((prepared) => toCompanion(
    prepared,
    input.primaryTiming,
    input.replayProgress,
  ))
}

export function buildReplayMapCompanions(input: {
  primarySessionId: string
  primaryUserId: string
  primaryTiming: ReplaySessionTiming
  primaryTrack: ReplayTrack
  sources: ActivityReplayRouteSource[]
  replayProgress: number
  useFixture?: boolean
}): ReplayMapCompanion[] {
  return revealReplayMapCompanions({
    primaryTiming: input.primaryTiming,
    replayProgress: input.replayProgress,
    prepared: prepareReplayMapCompanions(input),
  })
}
