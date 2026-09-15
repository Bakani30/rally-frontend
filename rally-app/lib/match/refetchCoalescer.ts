// Collapses a burst of refetch requests into at most one actual refetch per
// window. The match-detail realtime layer fires a `getMatch` refetch on every
// postgres_changes / broadcast tick; during multiplayer that fans out into
// dozens of concurrent heavy (~20-relation) reads that saturate the database
// and cross the 8s statement timeout (observed in prod as bursts of 500s).
//
// Routing every refetch request through a coalescer bounds it to one refetch
// per `windowMs` while keeping latency <= windowMs from the first event. The
// optimistic cache patch still runs immediately on each event, so the UI stays
// live — only the authoritative refetch is throttled.

export interface Coalescer {
  /** Request a run. The first call arms the window; calls inside it are dropped. */
  schedule(): void
  /**
   * Request a run with a leading edge: runs synchronously when no window is
   * armed, then opens a cooldown window. Calls inside any armed window queue
   * a single trailing run at the window close (which re-arms the cooldown),
   * so a sustained flood is bounded to one run per window. Use for
   * broadcast-triggered refetches — the `match:{uuid}` topic has no broadcast
   * authorization, so any authenticated client can spam events; the first
   * (legit) hint must stay instant while spam stays bounded.
   */
  scheduleLeading(): void
  /** Cancel a pending run (e.g. on unmount / match change). */
  cancel(): void
}

export interface CoalescerTimers {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

const defaultTimers: CoalescerTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export function createRefetchCoalescer(
  run: () => void,
  windowMs: number,
  timers: CoalescerTimers = defaultTimers,
): Coalescer {
  let handle: unknown = null
  let pendingRun = false

  const arm = () => {
    handle = timers.setTimeout(() => {
      handle = null
      if (pendingRun) {
        pendingRun = false
        run()
        // Re-arm as a pure cooldown: if nothing else arrives, the next close
        // is a no-op; if events keep flooding in, they stay bounded to one
        // run per window instead of alternating immediate + trailing runs.
        arm()
      }
    }, windowMs)
  }

  return {
    schedule() {
      pendingRun = true
      if (handle === null) arm()
    },
    scheduleLeading() {
      if (handle !== null) {
        pendingRun = true
        return
      }
      run()
      arm()
    },
    cancel() {
      if (handle !== null) {
        timers.clearTimeout(handle)
        handle = null
      }
      pendingRun = false
    },
  }
}
