import { useEffect, useMemo } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useAnalytics } from '@/hooks/useAnalytics'
import { invalidateRouteChallengeProgressQueries } from '@/lib/challenges/challengeQueryInvalidation'
import { verifyRouteMatch } from '@/lib/challenges/challengeService'
import { createRouteChallengeRetryVerifier } from '@/lib/challenges/routeChallengeRetryVerifier'
import { createRetryQueueController } from '@/lib/run-tracking/offline/retryQueueController'
import { runRetryQueue } from '@/lib/run-tracking/offline/retryQueue'
import { createRetrySessionSubmitter } from '@/lib/run-tracking/offline/retrySessionSubmitter'
import { recoverInterruptedActiveSessions } from '@/lib/run-tracking/offline/interruptedSessionRecovery'
import { emitRunSyncChanged } from '@/lib/run-tracking/offline/runSyncEvents'
import { useRunSessionStore } from '@/lib/run-tracking/session/runSessionStore'

/**
 * Periodic safety-net only — every foreground transition already fires a
 * runOnce, so this interval is the fallback for users who keep the app
 * open continuously. 5 minutes is long enough that an idle user doesn't
 * burn battery, short enough that any pending session lands inside the
 * window the user notices.
 */
const RETRY_INTERVAL_MS = 5 * 60_000

/**
 * Wires stopped-session upload retries into app lifecycle. The queue itself is
 * idempotent; the controller only prevents overlapping passes.
 *
 * Triggers: foreground resume (AppState) + 60s periodic timer.
 * Note: @react-native-community/netinfo requires a native rebuild so we rely
 * on the timer + AppState triggers which cover the reconnect case adequately.
 */
export function useRunSessionRetryQueue(): void {
  const queryClient = useQueryClient()
  const { track } = useAnalytics()

  const controller = useMemo(
    () =>
      createRetryQueueController({
        run: async () => {
          if (useRunSessionStore.getState().status === 'idle') {
            await recoverInterruptedActiveSessions()
          }
          return runRetryQueue(
            createRetrySessionSubmitter({
              verifyRouteChallenge: createRouteChallengeRetryVerifier({
                verifyRouteMatch,
                invalidateQueries: (challengeId) =>
                  invalidateRouteChallengeProgressQueries(queryClient, challengeId),
              }),
            }),
            {
              // Skip the run still held in memory (e.g. the post-stop summary) so
              // a retry tick can't upload it before the user submits or discards.
              excludeSessionId: useRunSessionStore.getState().sessionId,
              onDeadLetter: (code) => {
                track({ name: 'run_sync_dead_letter', properties: { code } })
              },
            },
          )
        },
        onResult: (result) => {
          // A pass that uploaded or dead-lettered a run changed the pending
          // count; nudge the visible sync-status reader so its pill can't show
          // a stale count until the next foreground/timer refresh.
          if (result.uploaded > 0 || result.deadLettered > 0) {
            emitRunSyncChanged()
          }
        },
        onError: (error) => {
          console.warn('run session retry queue failed', error)
        },
      }),
    [queryClient, track],
  )

  useEffect(() => {
    void controller.runOnce('app_active')

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void controller.runOnce('app_active')
      }
    })

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void controller.runOnce('timer')
      }
    }, RETRY_INTERVAL_MS)

    return () => {
      subscription.remove()
      clearInterval(timer)
    }
  }, [controller])
}
