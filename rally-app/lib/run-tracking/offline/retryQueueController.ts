import type { RetryRunResult } from './retryQueue'

export type RetryQueueTrigger = 'app_active' | 'timer' | 'manual' | 'network_reconnect'

export type RetryQueueControllerDeps = {
  run: (trigger: RetryQueueTrigger) => Promise<RetryRunResult>
  onResult?: (result: RetryRunResult, trigger: RetryQueueTrigger) => void
  onError?: (error: unknown, trigger: RetryQueueTrigger) => void
}

export type RetryQueueControllerState = {
  isRunning: boolean
  lastResult: RetryRunResult | null
  lastError: unknown
}

/**
 * Tiny concurrency guard around the retry runner. AppState and timers can fire
 * at the same time; only one upload pass should touch the SQLite queue.
 */
export function createRetryQueueController(deps: RetryQueueControllerDeps) {
  let isRunning = false
  let lastResult: RetryRunResult | null = null
  let lastError: unknown = null

  async function runOnce(trigger: RetryQueueTrigger): Promise<RetryRunResult | null> {
    if (isRunning) return null
    isRunning = true
    lastError = null
    try {
      const result = await deps.run(trigger)
      lastResult = result
      deps.onResult?.(result, trigger)
      return result
    } catch (error) {
      lastError = error
      deps.onError?.(error, trigger)
      return null
    } finally {
      isRunning = false
    }
  }

  function getState(): RetryQueueControllerState {
    return { isRunning, lastResult, lastError }
  }

  return { runOnce, getState }
}
