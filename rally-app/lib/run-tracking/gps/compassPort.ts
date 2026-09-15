/**
 * Compass heading subscription wrapper. Reads device magnetometer + sensor
 * fusion via expo-location's watchHeadingAsync — works while stationary
 * (unlike GPS-derived bearing). Used to drive the live arrow + map bearing
 * in real time, like Google Maps / Apple Maps / Strava.
 *
 * Detached from React so a hook (or any consumer) can subscribe directly.
 *
 * Heading delivery is throttled to ≥1° change — fine-grained enough to feel
 * real-time when rotating but coarse enough to skip raw sensor noise on a
 * still phone.
 */

import * as Location from 'expo-location'

export type CompassSnapshot = {
  /** Degrees from true north [0, 360). null when no fix yet. */
  heading: number | null
  /**
   * iOS: Location.Accuracy enum (0 high, 1 medium, 2 low, 3 none).
   * Android: best-effort surface from native; treat ≥2 as untrusted.
   * null when unknown.
   */
  accuracy: number | null
}

export type CompassListener = (snapshot: CompassSnapshot) => void

export interface CompassPort {
  subscribe(listener: CompassListener): Promise<() => void>
}

const MIN_DELTA_DEG = 1

class ExpoCompassAdapter implements CompassPort {
  async subscribe(listener: CompassListener): Promise<() => void> {
    let lastEmitted: number | null = null
    try {
      const sub = await Location.watchHeadingAsync((heading) => {
        // Prefer trueHeading (geographic); fall back to magHeading. expo-location
        // returns -1 when a value is unavailable.
        const raw =
          heading.trueHeading != null && heading.trueHeading >= 0
            ? heading.trueHeading
            : heading.magHeading != null && heading.magHeading >= 0
              ? heading.magHeading
              : null
        if (raw == null) return
        const normalized = ((raw % 360) + 360) % 360
        if (lastEmitted != null && angularDeltaDeg(lastEmitted, normalized) < MIN_DELTA_DEG) {
          return
        }
        lastEmitted = normalized
        listener({
          heading: normalized,
          accuracy: heading.accuracy ?? null,
        })
      })
      return () => sub.remove()
    } catch {
      // Compass is optional; callers fall back to GPS-derived bearing.
      return () => {}
    }
  }
}

class NullCompassAdapter implements CompassPort {
  async subscribe(_listener: CompassListener): Promise<() => void> {
    return () => {}
  }
}

/** Smallest angular distance between two compass readings, in degrees [0, 180]. */
export function angularDeltaDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function loadCompassPort(): CompassPort {
  // expo-location is always present in this app, but watchHeadingAsync
  // requires native magnetometer access — guard so a missing sensor
  // doesn't crash boot.
  try {
    if (typeof Location.watchHeadingAsync === 'function') {
      return new ExpoCompassAdapter()
    }
  } catch {
    /* fall through */
  }
  return new NullCompassAdapter()
}

export const compassPort: CompassPort = loadCompassPort()
