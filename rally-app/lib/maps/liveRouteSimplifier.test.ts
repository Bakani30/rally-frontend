import { describe, expect, it } from 'vitest'

import type { GpsPoint } from '../run-tracking/gps/gpsTypes'
import { buildLiveDisplayRoutePath } from './displayRoutePath'
import { LiveRouteSimplifier } from './liveRouteSimplifier'

const point = (lat: number, lng: number, timestamp: number): GpsPoint => ({
  lat,
  lng,
  accuracy: 5,
  timestamp,
  isPaused: false,
})

/**
 * Same deterministic walking trace used by displayRoutePath.test.ts: a sharp
 * corner plus sub-meter jitter, so simplification makes real keep/drop calls.
 */
function walkPath(): GpsPoint[] {
  const out: GpsPoint[] = []
  const stepDeg = 0.0000126
  let lat = 13.7
  let lng = 100.5
  for (let i = 0; i < 20; i++) {
    const jitter = Math.sin(i * 1.7) * 0.0000018
    out.push(point(lat + jitter, lng + jitter * 0.5, i * 1000))
    lat += stepDeg
  }
  for (let i = 0; i < 20; i++) {
    const jitter = Math.sin(i * 1.3) * 0.0000018
    out.push(point(lat + jitter * 0.5, lng + jitter, (20 + i) * 1000))
    lng += stepDeg
  }
  return out
}

describe('LiveRouteSimplifier', () => {
  it('matches buildLiveDisplayRoutePath at every prefix (no smoothing)', () => {
    const full = walkPath()
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })

    for (let n = 1; n <= full.length; n++) {
      sim.push(full[n - 1])
      const incremental = sim.getPath()
      const batch = buildLiveDisplayRoutePath(full.slice(0, n), {
        simplifyToleranceM: 4,
        smoothingPasses: 0,
      })
      expect(incremental).toEqual(batch)
    }
  })

  it('matches buildLiveDisplayRoutePath at every prefix (with smoothing)', () => {
    const full = walkPath()
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 1 })

    for (let n = 1; n <= full.length; n++) {
      sim.push(full[n - 1])
      const incremental = sim.getPath()
      const batch = buildLiveDisplayRoutePath(full.slice(0, n), {
        simplifyToleranceM: 4,
        smoothingPasses: 1,
      })
      expect(incremental).toEqual(batch)
    }
  })

  it('always reaches the latest pushed position', () => {
    const full = walkPath()
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })
    for (const p of full) sim.push(p)

    const out = sim.getPath()
    const last = full[full.length - 1]
    expect(out[out.length - 1].lat).toBe(last.lat)
    expect(out[out.length - 1].lng).toBe(last.lng)
  })

  it('reset() clears state so a new session starts fresh', () => {
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })
    sim.push(point(13.7, 100.5, 0))
    sim.push(point(13.701, 100.5, 1000))
    sim.reset()

    sim.push(point(40.0, -70.0, 0))
    expect(sim.getPath()).toEqual([point(40.0, -70.0, 0)])
  })

  it('ignores paused points — the trail freezes instead of scrawling GPS jitter', () => {
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })
    const settled = point(13.7, 100.5, 0)
    sim.push(settled)

    for (let i = 1; i <= 20; i++) {
      const jitter = Math.sin(i * 2.1) * 0.00007 // ~7-8m wobble
      sim.push({
        ...point(13.7 + jitter, 100.5 + jitter * 0.6, i * 1000),
        isPaused: true,
      })
    }

    expect(sim.getPath()).toEqual([settled])
  })

  it('stays byte-identical to the batch builder when the path contains paused points', () => {
    const full = walkPath()
    // Flag a stationary-jitter stretch as paused midway through the walk.
    const withPause: GpsPoint[] = [
      ...full.slice(0, 10),
      ...Array.from({ length: 8 }, (_, i) => {
        const jitter = Math.sin(i * 2.1) * 0.00007
        return {
          ...point(full[9].lat + jitter, full[9].lng + jitter * 0.6, (1000 + i) * 1000),
          isPaused: true,
        }
      }),
      ...full.slice(10),
    ]
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })

    for (let n = 1; n <= withPause.length; n++) {
      sim.push(withPause[n - 1])
      const incremental = sim.getPath()
      const batch = buildLiveDisplayRoutePath(withPause.slice(0, n), {
        simplifyToleranceM: 4,
        smoothingPasses: 0,
      })
      expect(incremental).toEqual(batch)
    }
  })

  it('commits at most one new vertex per push — interior vertices never move', () => {
    const full = walkPath()
    const sim = new LiveRouteSimplifier({ simplifyToleranceM: 4, smoothingPasses: 0 })

    let prevCommitted: GpsPoint[] = []
    for (const p of full) {
      sim.push(p)
      const out = sim.getPath()
      // Everything except the live tail vertex must be byte-identical to the
      // previously committed prefix — this is the index-tween stability the
      // animated map line relies on.
      const committed = out.slice(0, out.length - 1)
      expect(committed.slice(0, prevCommitted.length)).toEqual(prevCommitted)
      prevCommitted = committed
    }
  })
})
