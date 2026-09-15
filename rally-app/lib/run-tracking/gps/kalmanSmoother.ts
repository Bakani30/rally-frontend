/**
 * 1D Kalman filter for GPS position smoothing. Used to remove sample noise
 * before distance accumulation, reducing inflation by 3-8% on real runs.
 *
 * Implementation: constant-velocity model. State is [position, velocity]; the
 * predict step advances position by velocity·dt. A constant-*position* model
 * (the previous design) treats steady motion as noise to average away, so its
 * estimate trails the runner by a persistent offset and crawls toward the next
 * fix after a background gap — the "rubber-band" that drags the live line
 * behind on long trips. Carrying velocity removes that lag and lets the filter
 * absorb post-gap fixes smoothly.
 *
 * Process noise comes from a continuous white-noise-acceleration model with
 * spectral density `accelNoiseDensity` (m²/s³); measurement noise r is m²
 * (reported accuracy²). We run two independent 1D filters on a local meter
 * projection anchored at the first sample, so the variances stay in m² and the
 * Kalman gain keeps its intended physical meaning.
 *
 * Pure class — no side effects beyond internal state. Caller owns lifecycle.
 */

/**
 * Continuous white-noise acceleration spectral density (m²/s³).
 *
 * 0.6 (the original value) keeps the Kalman gain floor around ~0.35-0.6
 * indefinitely — realistic stationary GPS noise (accuracy ≈ 8m) then passes
 * through almost unfiltered, so the live marker visibly "walks in place"
 * while the runner stands still. 0.15 still tracks a steady 3 m/s runner
 * within ~2m and recovers from a background gap within ~6m (see
 * kalmanSmoother.test.ts), while cutting stationary jitter.
 */
const DEFAULT_ACCEL_NOISE_DENSITY = 0.15

/**
 * Initial velocity variance (m²/s²) — ~2 m/s 1σ for a cold start.
 *
 * Was 25 (~5 m/s 1σ), wide enough that the filter barely trusted its own
 * "not moving" state for the first ~15-20s of every session, dominated by
 * raw GPS noise instead. 4 still lets a genuine quick start through (the
 * constant-velocity model carries momentum forward either way) without
 * treating every cold start as a plausible sprint.
 */
const INITIAL_VELOCITY_VARIANCE = 4

export class Kalman1D {
  private position: number | null = null
  private velocity = 0
  // Covariance matrix P = [[p00, p01], [p10, p11]].
  private p00 = 1
  private p01 = 0
  private p10 = 0
  private p11 = INITIAL_VELOCITY_VARIANCE
  private lastTimestamp: number | null = null

  constructor(private readonly accelNoiseDensity = DEFAULT_ACCEL_NOISE_DENSITY) {}

  /**
   * Fold a measurement into the filter and return the updated position estimate.
   * `accuracy` is the GPS-reported accuracy in meters (1σ).
   */
  update(measurement: number, accuracy: number, timestampMs: number): number {
    if (this.position === null || this.lastTimestamp === null) {
      this.position = measurement
      this.velocity = 0
      this.p00 = accuracy * accuracy
      this.p01 = 0
      this.p10 = 0
      this.p11 = INITIAL_VELOCITY_VARIANCE
      this.lastTimestamp = timestampMs
      return measurement
    }

    const dt = Math.max(0, (timestampMs - this.lastTimestamp) / 1000)
    this.lastTimestamp = timestampMs

    // Predict — advance position by velocity, grow covariance via F P Fᵀ + Q.
    this.position += this.velocity * dt

    const fp00 = this.p00 + dt * (this.p10 + this.p01) + dt * dt * this.p11
    const fp01 = this.p01 + dt * this.p11
    const fp10 = this.p10 + dt * this.p11
    const fp11 = this.p11

    const q = this.accelNoiseDensity
    const dt2 = dt * dt
    const dt3 = dt2 * dt
    this.p00 = fp00 + (q * dt3) / 3
    this.p01 = fp01 + (q * dt2) / 2
    this.p10 = fp10 + (q * dt2) / 2
    this.p11 = fp11 + q * dt

    // Update — measure position only (H = [1, 0]).
    const r = accuracy * accuracy
    const s = this.p00 + r
    const k0 = this.p00 / s
    const k1 = this.p10 / s
    const residual = measurement - this.position
    this.position += k0 * residual
    this.velocity += k1 * residual

    const np00 = (1 - k0) * this.p00
    const np01 = (1 - k0) * this.p01
    const np10 = this.p10 - k1 * this.p00
    const np11 = this.p11 - k1 * this.p01
    this.p00 = np00
    this.p01 = np01
    this.p10 = np10
    this.p11 = np11

    return this.position
  }

  reset(): void {
    this.position = null
    this.velocity = 0
    this.p00 = 1
    this.p01 = 0
    this.p10 = 0
    this.p11 = INITIAL_VELOCITY_VARIANCE
    this.lastTimestamp = null
  }
}

/**
 * Convenience pair filter operating on lat/lng simultaneously. Use one
 * instance per session; reset between sessions.
 */
export class KalmanLatLng {
  private latFilter = new Kalman1D()
  private lngFilter = new Kalman1D()
  private origin: { lat: number; lng: number; metersPerDegLng: number } | null = null

  smooth(
    measurement: { lat: number; lng: number; accuracy: number; timestamp: number },
  ): { lat: number; lng: number } {
    if (!this.origin) {
      this.origin = {
        lat: measurement.lat,
        lng: measurement.lng,
        metersPerDegLng: metersPerDegLngAtLat(measurement.lat),
      }
    }

    const origin = this.origin
    const measuredY = (measurement.lat - origin.lat) * METERS_PER_DEG_LAT
    const measuredX = (measurement.lng - origin.lng) * origin.metersPerDegLng
    const y = this.latFilter.update(measuredY, measurement.accuracy, measurement.timestamp)
    const x = this.lngFilter.update(measuredX, measurement.accuracy, measurement.timestamp)

    return {
      lat: origin.lat + y / METERS_PER_DEG_LAT,
      lng: origin.lng + x / origin.metersPerDegLng,
    }
  }

  reset(): void {
    this.latFilter.reset()
    this.lngFilter.reset()
    this.origin = null
  }
}

/** 1° latitude ≈ 111_320 m everywhere. */
const METERS_PER_DEG_LAT = 111_320

/** 1° longitude varies with cos(lat). */
function metersPerDegLngAtLat(lat: number): number {
  return Math.max(1, METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180))
}
