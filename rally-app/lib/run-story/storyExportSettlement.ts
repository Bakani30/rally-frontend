// Settle-once wrapper around a pending promise's resolve/reject pair, used by
// hooks/useRunStoryVideoExport.ts so that EVERY failure path — recorder-load
// failure, startRecording rejection, stopRecording failure, and app-background
// interruption (which fires from an AppState listener outside the begin()
// promise chain) — settles the outstanding begin() promise exactly once.
// Without this, an interruption would FAIL the state machine but leave the
// caller's `await begin()` hanging forever. Pure — no React/native imports.

export type PendingSettlement<T> = {
  /** Settles with a value; no-op if already settled. Returns true if it settled now. */
  resolve: (value: T) => boolean
  /** Settles with an error; no-op if already settled. Returns true if it settled now. */
  reject: (error: Error) => boolean
  /** True once resolve or reject has fired. */
  isSettled: () => boolean
}

export function createPendingSettlement<T>(
  resolve: (value: T) => void,
  reject: (error: Error) => void,
): PendingSettlement<T> {
  let settled = false
  return {
    resolve: (value) => {
      if (settled) return false
      settled = true
      resolve(value)
      return true
    },
    reject: (error) => {
      if (settled) return false
      settled = true
      reject(error)
      return true
    },
    isSettled: () => settled,
  }
}
