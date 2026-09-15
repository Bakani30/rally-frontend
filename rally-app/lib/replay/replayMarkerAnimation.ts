export type ReplayMarkerCoordinate = [number, number] | null

/**
 * Interpolate a marker in MapLibre's [longitude, latitude] coordinate order.
 * A marker that appears has no meaningful origin, so it snaps to its target;
 * a marker that disappears remains visible until the transition completes.
 */
export function interpolateReplayMarkerCoordinate(
  from: ReplayMarkerCoordinate,
  to: ReplayMarkerCoordinate,
  progress: number,
): ReplayMarkerCoordinate {
  const clampedProgress = Math.max(0, Math.min(1, progress))

  if (!from && !to) return null
  if (!from) return to
  if (!to) return clampedProgress >= 1 ? null : from

  return [
    from[0] + (to[0] - from[0]) * clampedProgress,
    from[1] + (to[1] - from[1]) * clampedProgress,
  ]
}
