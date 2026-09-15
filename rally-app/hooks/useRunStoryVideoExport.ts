import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import {
  chromeHidden as computeChromeHidden,
  initialReplayRecording,
  isCapturing as computeIsCapturing,
  replayRecordingReducer,
  type ReplayRecordingFailReason,
} from '@/lib/replay/replayRecording'
import {
  deleteVideoFile,
  loadScreenRecorder,
  recorderUnavailableError,
} from '@/lib/screen-recording/screenRecorderClient'
import { clampStoryExportDurationMs } from '@/lib/run-story/storyExportDuration'
import {
  createPendingSettlement,
  type PendingSettlement,
} from '@/lib/run-story/storyExportSettlement'

/**
 * Records the on-screen run-story card (video background + metric overlay)
 * to an mp4 for one background-loop, reusing the same building blocks as the
 * 3D run-replay export (hooks/useReplayVideoShare.ts):
 * lib/replay/replayRecording.ts's countdown/chrome-hide state machine and
 * lib/screen-recording/screenRecorderClient.ts's expo-screen-recorder loader.
 *
 * Unlike replay (which waits for an external "finale" animation to finish
 * before stopping), the story card has no external end-of-clip signal, so
 * `begin()` self-schedules the stop after a clamped duration and resolves
 * with the recorded file's uri — the caller (app/run/share/[sessionId].tsx)
 * awaits it directly instead of polling hook state, then reuses the same
 * media-library-save + upload flow it already has for the photo path.
 */

const COUNTDOWN_FROM = 2
const interruptedError = 'การอัดถูกขัดจังหวะ ลองใหม่อีกครั้ง'

function classifyRecordingStartError(err: unknown): ReplayRecordingFailReason {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (message.includes('declin') || message.includes('denied') || message.includes('permission') || message.includes('cancel')) {
    return 'permission_denied'
  }
  return 'capture_failed'
}

export function useRunStoryVideoExport() {
  const [ctx, setCtx] = useState(() => initialReplayRecording(COUNTDOWN_FROM))
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_FROM)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The outstanding begin() promise's settle-once handle. EVERY failure path
  // must settle it — including the AppState-interruption effect below, which
  // fires outside begin()'s own promise chain. Without this, an interruption
  // FAILs the state machine but leaves the caller's `await begin()` hanging
  // forever (busyAction stuck, all share-screen actions permanently disabled).
  const pendingRef = useRef<PendingSettlement<string> | null>(null)
  // Latest ctx for the unmount cleanup — effects with [] can't see fresh state.
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current != null) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (durationTimeoutRef.current != null) {
      clearTimeout(durationTimeoutRef.current)
      durationTimeoutRef.current = null
    }
  }, [])

  // Unmount mid-capture: the recorder captures the whole device screen, so
  // leaving it running is a privacy leak — stop it best-effort and drop any
  // recorded file still sitting in cache (mirrors useReplayVideoShare.ts).
  useEffect(() => () => {
    clearTimers()
    pendingRef.current?.reject(new Error(interruptedError))
    const last = ctxRef.current
    if (computeIsCapturing(last)) {
      void loadScreenRecorder()
        .then((recorder) => recorder.stopRecording())
        .then((uri) => (uri ? deleteVideoFile(uri) : undefined))
        .catch(() => {
          // startRecording may never have begun (countdown) — nothing to stop.
        })
    } else if (last.videoUri) {
      void deleteVideoFile(last.videoUri)
    }
  }, [clearTimers])

  // App backgrounded mid-recording → stop, fail as interrupted, AND settle the
  // outstanding begin() promise so the awaiting caller never hangs.
  useEffect(() => {
    if (ctx.state !== 'recording') return
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'background' && nextAppState !== 'inactive') return
      clearTimers()
      pendingRef.current?.reject(new Error(interruptedError))
      void (async () => {
        try {
          const recorder = await loadScreenRecorder()
          await recorder.stopRecording()
        } catch {
          // best-effort cleanup; the FAIL below still fires regardless.
        }
        setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason: 'interrupted' }))
      })()
    })
    return () => subscription.remove()
  }, [ctx.state, clearTimers])

  /**
   * Starts the countdown → chrome-hide → record → stop flow and resolves
   * with the recorded mp4's local uri. `sourceDurationSeconds` is the
   * video-background clip's own duration once known (null before it loads),
   * clamped into a sane recording window by clampStoryExportDurationMs.
   */
  const begin = useCallback((sourceDurationSeconds: number | null): Promise<string> => {
    clearTimers()
    // Settle any still-outstanding previous begin() before starting fresh —
    // its awaiter must never be left hanging.
    pendingRef.current?.reject(new Error(interruptedError))
    // replayRecordingReducer's START only fires from 'idle', so a non-idle
    // leftover state (e.g. 'ready' from a prior capture, or 'failed' after an
    // interruption) must be force-reset first or this begin() would silently
    // no-op. The prior export's temp mp4 is no longer reachable by the caller
    // at this point (a re-record means the story content changed), so drop it
    // best-effort instead of leaking it in cache until unmount.
    const previousUri = ctxRef.current.videoUri
    if (previousUri) {
      try {
        void deleteVideoFile(previousUri)
      } catch {
        // deleteVideoFile never throws, but keep the cleanup non-fatal regardless.
      }
    }
    setCtx((c) => (c.state === 'idle' ? c : replayRecordingReducer(c, { type: 'RESET' })))

    return new Promise<string>((resolve, reject) => {
      const pending = createPendingSettlement<string>(resolve, reject)
      pendingRef.current = pending

      void (async () => {
        let recorder
        try {
          recorder = await loadScreenRecorder()
        } catch {
          setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason: 'recorder_unavailable' }))
          pending.reject(new Error(recorderUnavailableError))
          return
        }
        if (pending.isSettled()) return

        setCtx((c) => replayRecordingReducer(c, { type: 'START' }))
        setCountdownValue(COUNTDOWN_FROM)

        let remaining = COUNTDOWN_FROM
        countdownIntervalRef.current = setInterval(() => {
          remaining -= 1
          if (remaining > 0) {
            setCountdownValue(remaining)
            return
          }
          clearTimers()
          setCountdownValue(0)
          void (async () => {
            try {
              await recorder.startRecording(false)
              setCtx((c) => replayRecordingReducer(c, { type: 'COUNTDOWN_DONE' }))
            } catch (err) {
              const reason = classifyRecordingStartError(err)
              setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason }))
              pending.reject(err instanceof Error ? err : new Error('capture_failed'))
              return
            }
            if (pending.isSettled()) {
              // Interrupted while startRecording was in flight — the
              // interruption path already stopped the recorder and settled.
              return
            }

            const durationMs = clampStoryExportDurationMs(sourceDurationSeconds)
            durationTimeoutRef.current = setTimeout(() => {
              void (async () => {
                setCtx((c) => replayRecordingReducer(c, { type: 'FINALE_COMPLETE' }))
                try {
                  const fileName = `rally-story-${Date.now()}`
                  const uri = await recorder.stopRecording(fileName)
                  if (!uri) throw new Error('empty_uri')
                  setCtx((c) => replayRecordingReducer(c, { type: 'RECORDED', uri }))
                  pending.resolve(uri)
                } catch (err) {
                  setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason: 'capture_failed' }))
                  pending.reject(err instanceof Error ? err : new Error('capture_failed'))
                }
              })()
            }, durationMs)
          })()
        }, 1000)
      })()
    })
  }, [clearTimers])

  const reset = useCallback(() => {
    clearTimers()
    pendingRef.current?.reject(new Error(interruptedError))
    const videoUri = ctxRef.current.videoUri
    if (videoUri) void deleteVideoFile(videoUri)
    setCtx((c) => replayRecordingReducer(c, { type: 'RESET' }))
    setCountdownValue(COUNTDOWN_FROM)
  }, [clearTimers])

  return {
    state: ctx.state,
    chromeHidden: computeChromeHidden(ctx),
    isCapturing: computeIsCapturing(ctx),
    countdownValue,
    begin,
    reset,
  }
}
