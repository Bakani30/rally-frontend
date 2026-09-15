/**
 * Tiny in-process pub/sub so the visible sync-status reader can react the moment
 * the background retry queue changes the offline buffer.
 *
 * Why this exists: the retry queue (wired in `useRunSessionRetryQueue`, mounted
 * at the app root) uploads/dead-letters stopped runs, while the status pill
 * (`useRunSyncStatus`, mounted on Home) only re-reads the count on mount /
 * foreground / a 5-minute timer. On a cold start both fire once in parallel, so
 * the reader can read the pre-flush count (e.g. "รอซิงค์ 1 รายการ") and then
 * never learn the flush already cleared it — the pill shows a stale count for up
 * to 5 minutes. Emitting on every queue change lets the reader refresh promptly.
 *
 * Pure module: no React, no analytics — just a listener set.
 */
type Listener = () => void

const listeners = new Set<Listener>()

/** Notify subscribers that the offline run-sync queue changed (upload / dead-letter). */
export function emitRunSyncChanged(): void {
  for (const listener of listeners) listener()
}

/** Subscribe to run-sync queue changes. Returns an unsubscribe function. */
export function subscribeRunSyncChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
