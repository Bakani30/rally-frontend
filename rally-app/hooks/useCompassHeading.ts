import { useEffect, useState } from 'react'
import { compassPort, type CompassSnapshot } from '@/lib/run-tracking/gps/compassPort'

/**
 * Subscribe to device compass while `enabled` is true. Returns the latest
 * heading + sensor accuracy, or null when no fix yet / sensor unavailable.
 *
 * Caller decides when to enable (typically: location permission granted).
 * Updates are pre-throttled by compassPort (≥3° change).
 */
export function useCompassHeading(enabled: boolean): CompassSnapshot {
  const [snapshot, setSnapshot] = useState<CompassSnapshot>({ heading: null, accuracy: null })

  useEffect(() => {
    if (!enabled) {
      setSnapshot({ heading: null, accuracy: null })
      return
    }
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    void compassPort
      .subscribe((next) => {
        if (cancelled) return
        setSnapshot(next)
      })
      .then((unsub) => {
        if (cancelled) {
          unsub()
          return
        }
        unsubscribe = unsub
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [enabled])

  return snapshot
}
