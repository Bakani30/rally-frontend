import { useRef } from 'react'

import {
  LiveRouteSimplifier,
  type LiveRouteSimplifierOptions,
} from '@/lib/maps/liveRouteSimplifier'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'

type SimplifierCache = {
  sim: LiveRouteSimplifier
  consumed: number
  sig: string
  first: GpsPoint | null
}

function optionsSignature(options: LiveRouteSimplifierOptions): string {
  return `${options.simplifyToleranceM ?? ''}:${options.smoothingPasses ?? ''}`
}

/**
 * Bridge the append-only live GPS buffer to the incremental
 * {@link LiveRouteSimplifier}. The simplifier carries committed state across
 * renders in a ref so each new sample costs amortized O(1), instead of
 * re-simplifying the whole buffer every render (the old O(n²) live-route jank).
 *
 * The ref is used purely as a render cache: pushing the new tail is idempotent
 * (guarded by `consumed`), so a StrictMode double-render pushes nothing the
 * second time. The cache is rebuilt from scratch when the options change, when
 * the buffer shrinks, or when its first point changes identity — i.e. a new
 * session replaced the array.
 */
export function useLiveDisplayRoute(
  path: GpsPoint[],
  options: LiveRouteSimplifierOptions,
): GpsPoint[] {
  const cacheRef = useRef<SimplifierCache | null>(null)
  const sig = optionsSignature(options)

  let cache = cacheRef.current
  const sessionReset =
    cache != null &&
    path.length > 0 &&
    cache.first != null &&
    cache.first !== path[0]
  if (cache == null || cache.sig !== sig || path.length < cache.consumed || sessionReset) {
    cache = { sim: new LiveRouteSimplifier(options), consumed: 0, sig, first: null }
    cacheRef.current = cache
  }

  for (let i = cache.consumed; i < path.length; i++) {
    cache.sim.push(path[i])
  }
  cache.consumed = path.length
  cache.first = path.length > 0 ? path[0] : null

  return cache.sim.getPath()
}
