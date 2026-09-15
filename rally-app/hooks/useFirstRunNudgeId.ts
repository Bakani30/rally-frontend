import { useEffect, useState } from 'react'

/** Module-level so the nudge plays once per app launch, not per screen mount. */
let shown = false

/**
 * Returns the id that should play the one-time swipe-discovery nudge, or null.
 * Picks the first defined candidate id and yields it once per app launch.
 */
export function useFirstRunNudgeId(
  enabled: boolean,
  candidateIds: (string | undefined | null)[],
): string | null {
  const [nudgeId, setNudgeId] = useState<string | null>(null)
  const firstId = candidateIds.find((id): id is string => !!id) ?? null

  useEffect(() => {
    if (shown || !enabled || !firstId) return
    shown = true
    setNudgeId(firstId)
  }, [enabled, firstId])

  return nudgeId
}
