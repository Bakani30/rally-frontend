import { haversineMeters } from './gpsDistance'
import type { GpsPoint } from './gpsTypes'

/**
 * Rolling-window pace smoother. Raw instantaneous GPS pace bounces between
 * 4:00 and 8:00 per km on the same steady run because of sample noise —
 * unusable for live UI. We compute pace over a rolling 30-second window
 * to give the runner a stable reading.
 *
 * Returns null while the buffer is too sparse for a meaningful average.
 *
 * Pure class — testable without device.
 */

export const ROLLING_WINDOW_MS = 30_000
const MIN_BUFFER_DISTANCE_M = 30 // less than this = too noisy to report

export class PaceSmoother {
  private buffer: GpsPoint[] = []

  push(point: GpsPoint): void {
    if (point.isPaused) return
    this.buffer.push(point)
    this.trim(point.timestamp)
  }

  /**
   * Current rolling pace in seconds-per-km. Returns null while buffer is
   * too sparse for stable display.
   */
  currentPaceSecPerKm(nowMs: number): number | null {
    this.trim(nowMs)
    if (this.buffer.length < 2) return null

    const oldest = this.buffer[0]
    const newest = this.buffer[this.buffer.length - 1]
    const dtSec = (newest.timestamp - oldest.timestamp) / 1000
    if (dtSec < 5) return null

    let meters = 0
    for (let i = 1; i < this.buffer.length; i++) {
      meters += haversineMeters(this.buffer[i - 1], this.buffer[i])
    }

    if (meters < MIN_BUFFER_DISTANCE_M) return null

    return Math.round((dtSec / meters) * 1000)
  }

  reset(): void {
    this.buffer = []
  }

  private trim(nowMs: number): void {
    const cutoff = nowMs - ROLLING_WINDOW_MS
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift()
    }
  }
}

/** Format pace seconds-per-km as M:SS/km (e.g. 350 → "5:50/km"). */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm)) return '--:--/km'
  const min = Math.floor(secondsPerKm / 60)
  const sec = Math.floor(secondsPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}
