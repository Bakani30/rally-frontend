import { useEffect, useRef, useState } from 'react'

import {
  interpolateReplayMarkerCoordinate,
  type ReplayMarkerCoordinate,
} from '@/lib/replay/replayMarkerAnimation'

export type ReplayMarkerTargets = Record<string, ReplayMarkerCoordinate>

function targetSignature(targets: ReplayMarkerTargets): string {
  return Object.keys(targets)
    .sort()
    .map((key) => `${key}:${JSON.stringify(targets[key])}`)
    .join('|')
}

function interpolateTargets(
  from: ReplayMarkerTargets,
  to: ReplayMarkerTargets,
  progress: number,
): ReplayMarkerTargets {
  const keys = new Set([...Object.keys(from), ...Object.keys(to)])
  const next: ReplayMarkerTargets = {}

  for (const key of keys) {
    next[key] = interpolateReplayMarkerCoordinate(from[key] ?? null, to[key] ?? null, progress)
  }

  return next
}

/** Smooths high-frequency replay position updates for custom MapLibre markers. */
export function useReplayMarkerAnimation(
  targets: ReplayMarkerTargets,
  durationMs = 110,
): ReplayMarkerTargets {
  const renderedTargetsRef = useRef<ReplayMarkerTargets>(targets)
  const targetsRef = useRef<ReplayMarkerTargets>(targets)
  const frameRef = useRef<number | null>(null)
  const [renderedTargets, setRenderedTargets] = useState<ReplayMarkerTargets>(targets)
  const signature = targetSignature(targets)
  targetsRef.current = targets

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)

    const startTargets = renderedTargetsRef.current
    const endTargets = targetsRef.current
    const startedAt = performance.now()

    if (durationMs <= 0) {
      renderedTargetsRef.current = endTargets
      setRenderedTargets(endTargets)
      return undefined
    }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const next = interpolateTargets(startTargets, endTargets, progress)
      renderedTargetsRef.current = next
      setRenderedTargets(next)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [durationMs, signature])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  return renderedTargets
}
