import { haversineMeters } from '../run-tracking/gps/gpsDistance'
import type { GpsPoint } from '../run-tracking/gps/gpsTypes'
import { pointToSegmentDistanceMeters, smoothPath } from './displayRoutePath'

// Must stay in sync with displayRoutePath.ts — the streaming class and the
// batch builder are asserted byte-identical, so they must share defaults.
const DEFAULT_SIMPLIFY_TOLERANCE_M = 8
const DEFAULT_SMOOTHING_PASSES = 0

export type LiveRouteSimplifierOptions = {
  simplifyToleranceM?: number
  smoothingPasses?: number
}

/**
 * Incremental, prefix-stable streaming simplifier — the stateful twin of
 * {@link buildLiveDisplayRoutePath}.
 *
 * Why this exists: the live run view recomputed `buildLiveDisplayRoutePath`
 * over the *entire* full-rate GPS buffer on every render. On a long run the
 * buffer grows to tens of thousands of points, so that O(n) recompute fired
 * once per ~1 Hz sample → O(n²) over the session, which is the visible
 * "the longer I run, the more the line lags" jank.
 *
 * The streaming simplifier already commits a vertex from a bounded one-point
 * look-ahead, so feeding it points one at a time produces the byte-identical
 * committed prefix that the batch function produces — only the live tail
 * vertex and the smoothing tail are ever recomputed. Pushing each new sample
 * is amortized O(1); {@link getPath} only re-smooths the (already small)
 * simplified vertex list, not the raw buffer.
 *
 * Display-only: like its batch twin, this never feeds distance, pace, or
 * verification. Hold one instance per session and {@link reset} between runs.
 */
export class LiveRouteSimplifier {
  private readonly toleranceM: number
  private readonly smoothingPasses: number

  /** Committed vertices, excluding the not-yet-committed live tail. */
  private kept: GpsPoint[] = []
  private anchor: GpsPoint | null = null
  /** The live tail vertex — always re-emitted so the line reaches the runner. */
  private candidate: GpsPoint | null = null
  private count = 0

  constructor(options: LiveRouteSimplifierOptions = {}) {
    this.toleranceM = options.simplifyToleranceM ?? DEFAULT_SIMPLIFY_TOLERANCE_M
    this.smoothingPasses = options.smoothingPasses ?? DEFAULT_SMOOTHING_PASSES
  }

  reset(): void {
    this.kept = []
    this.anchor = null
    this.candidate = null
    this.count = 0
  }

  /**
   * Fold one new GPS point into the simplified path. Amortized O(1).
   *
   * Paused points (auto-pause, manual pause/resume boundary) are ignored —
   * mirrors {@link buildLiveDisplayRoutePath}'s pre-filter so the two stay
   * byte-identical. Without this, jittery paused samples were always the
   * "live tail" and, past the display tolerance, got baked into permanent trail
   * vertices — the line scrawled into a tangle while the runner stood still.
   */
  push(point: GpsPoint): void {
    if (point.isPaused) return
    this.count += 1

    if (this.count === 1) {
      this.kept = [point]
      this.anchor = point
      return
    }
    if (this.count === 2) {
      this.candidate = point
      return
    }

    // count >= 3: evaluate the standing candidate against (anchor, next=point),
    // mirroring simplifyStreaming's loop body exactly.
    const anchor = this.anchor as GpsPoint
    const candidate = this.candidate as GpsPoint
    const bendsTooFar =
      pointToSegmentDistanceMeters(candidate, anchor, point) > this.toleranceM
    const farFromAnchor = haversineMeters(anchor, candidate) >= this.toleranceM
    if (this.toleranceM <= 0 || bendsTooFar || farFromAnchor) {
      this.kept.push(candidate)
      this.anchor = candidate
    }
    this.candidate = point
  }

  /**
   * Current display path: the committed prefix plus the live tail, smoothed.
   * Mirrors {@link buildLiveDisplayRoutePath}: paths shorter than 3 points are
   * returned unsmoothed.
   */
  getPath(): GpsPoint[] {
    if (this.count === 0) return []
    if (this.count < 3) {
      return this.candidate ? [...this.kept, this.candidate] : [...this.kept]
    }
    const simplified = [...this.kept, this.candidate as GpsPoint]
    return smoothPath(simplified, this.smoothingPasses)
  }
}
