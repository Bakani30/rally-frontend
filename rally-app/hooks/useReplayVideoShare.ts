import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'

import { useAnalytics } from '@/hooks/useAnalytics'
import {
  canFinalizeRecording,
  initialReplayRecording,
  isCapturing as computeIsCapturing,
  chromeHidden as computeChromeHidden,
  replayRecordingReducer,
  type ReplayRecordingFailReason,
} from '@/lib/replay/replayRecording'
import {
  deleteVideoFile,
  loadMediaLibrary,
  loadScreenRecorder,
  loadSharing,
  nativeShareError,
  readableRecorderError as readableError,
  recorderUnavailableError,
  type ScreenRecorderModule,
} from '@/lib/screen-recording/screenRecorderClient'
import { videoMimeTypeForUri } from '@/lib/share/videoFileType'

/**
 * Bridges the pure replayRecording state machine to expo-screen-recorder and
 * the share/save/Instagram flows for the 3D run-replay video. Mirrors the
 * lazy dynamic-import pattern used by useRunSummaryExport.ts and the
 * NativeShareModule handling in app/run/share/[sessionId].tsx.
 *
 * expo-screen-recorder (v0.1.8) exposes no separate "request permission" API
 * — the OS permission prompt is embedded inside startRecording() itself and
 * can't be triggered ahead of time. So permission_denied here is classified
 * from the startRecording() rejection at countdown-end, not at begin().
 */

export const COUNTDOWN_FROM = 3
/** Extra hold after the finale camera settles, before we stop the recorder. */
export const FINALE_HOLD_MS = 800

export type ReplayVideoExportMethod = 'share_sheet' | 'save_video' | 'instagram_story'

type InstagramStoryShareOptions = {
  social: string
  appId: string
  backgroundVideo: string
}

type NativeShareModule = {
  default?: { shareSingle?: (options: InstagramStoryShareOptions) => Promise<unknown> }
  shareSingle?: (options: InstagramStoryShareOptions) => Promise<unknown>
  Social?: { InstagramStories?: string }
}

const permissionDeniedError = 'ไม่ได้รับสิทธิ์บันทึกหน้าจอ'

const loadInstagramShare = async () => {
  try {
    const shareModule = await import('react-native-share') as NativeShareModule
    const shareSingle = shareModule.default?.shareSingle ?? shareModule.shareSingle
    const instagramStories = shareModule.Social?.InstagramStories
    if (typeof shareSingle === 'function' && instagramStories) {
      return { shareSingle, instagramStories }
    }
  } catch {
    // Let the caller show a user-facing error instead of crashing.
  }
  throw new Error(nativeShareError)
}

function classifyRecordingStartError(err: unknown): ReplayRecordingFailReason {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (message.includes('declin') || message.includes('denied') || message.includes('permission') || message.includes('cancel')) {
    return 'permission_denied'
  }
  return 'capture_failed'
}

function classifyRecordingStopError(err: unknown): ReplayRecordingFailReason {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  if (message.includes('storage') || message.includes('disk') || message.includes('space')) return 'storage_full'
  return 'capture_failed'
}

export function useReplayVideoShare() {
  const { track } = useAnalytics()
  const [ctx, setCtx] = useState(() => initialReplayRecording(COUNTDOWN_FROM))
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_FROM)
  const [busy, setBusy] = useState(false)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Latest ctx for the unmount cleanup — effects with [] can't see fresh state.
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current != null) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  // Unmount (e.g. Android hardware back mid-capture): the recorder captures
  // the whole device screen, so leaving it running is a privacy leak — stop it
  // best-effort, and drop any recorded file still sitting in cache.
  useEffect(() => () => {
    clearCountdownInterval()
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
  }, [clearCountdownInterval])

  // App backgrounded mid-recording → stop + fail as interrupted.
  useEffect(() => {
    if (ctx.state !== 'recording') return
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const interrupted =
        nextAppState === 'background' || (Platform.OS === 'ios' && nextAppState === 'inactive')
      if (!interrupted) return
      void (async () => {
        try {
          const recorder = await loadScreenRecorder()
          await recorder.stopRecording()
        } catch {
          // best-effort cleanup; the FAIL below still fires regardless.
        }
        setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason: 'interrupted' }))
        track({ name: 'run_replay_video_export_abandoned', properties: { reason: 'interrupted' } })
      })()
    })
    return () => subscription.remove()
  }, [ctx.state, track])

  const begin = useCallback(async () => {
    clearCountdownInterval()

    let recorder: ScreenRecorderModule
    try {
      recorder = await loadScreenRecorder()
    } catch {
      setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason: 'recorder_unavailable' }))
      return
    }

    setCtx((c) => replayRecordingReducer(c, { type: 'START' }))
    setCountdownValue(COUNTDOWN_FROM)

    let remaining = COUNTDOWN_FROM
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining > 0) {
        setCountdownValue(remaining)
        return
      }
      clearCountdownInterval()
      setCountdownValue(0)
      void (async () => {
        try {
          await recorder.startRecording(false)
          setCtx((c) => replayRecordingReducer(c, { type: 'COUNTDOWN_DONE' }))
        } catch (err) {
          const reason = classifyRecordingStartError(err)
          setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason }))
          if (reason === 'permission_denied') {
            track({ name: 'run_replay_video_export_abandoned', properties: { reason: 'permission_denied' } })
          }
        }
      })()
    }, 1000)
  }, [clearCountdownInterval, track])

  const onFinaleComplete = useCallback(async () => {
    if (!canFinalizeRecording(ctxRef.current)) return
    setCtx((c) => replayRecordingReducer(c, { type: 'FINALE_COMPLETE' }))
    try {
      const recorder = await loadScreenRecorder()
      const fileName = `rally-replay-${Date.now()}`
      const uri = await recorder.stopRecording(fileName)
      if (!uri) throw new Error('empty_uri')
      setCtx((c) => replayRecordingReducer(c, { type: 'RECORDED', uri }))
    } catch (err) {
      const reason = classifyRecordingStopError(err)
      setCtx((c) => replayRecordingReducer(c, { type: 'FAIL', reason }))
    }
  }, [])

  const shareVideo = useCallback(async () => {
    if (!ctx.videoUri) return
    setBusy(true)
    track({ name: 'run_replay_video_export_attempted', properties: { method: 'share_sheet' } })
    const startedAt = Date.now()
    try {
      const sharing = await loadSharing()
      const isAvailable = await sharing.isAvailableAsync()
      if (!isAvailable) throw new Error('อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์ ลองใหม่บนอุปกรณ์อื่น')
      await sharing.shareAsync(ctx.videoUri, { mimeType: videoMimeTypeForUri(ctx.videoUri) })
      track({
        name: 'run_replay_video_export_succeeded',
        properties: { method: 'share_sheet', duration_ms: Date.now() - startedAt },
      })
    } catch (err) {
      track({
        name: 'run_replay_video_export_failed',
        properties: { method: 'share_sheet', reason: readableError(err, 'export_failed') },
      })
    } finally {
      setBusy(false)
    }
  }, [ctx.videoUri, track])

  const saveVideo = useCallback(async () => {
    if (!ctx.videoUri) return
    setBusy(true)
    track({ name: 'run_replay_video_export_attempted', properties: { method: 'save_video' } })
    const startedAt = Date.now()
    try {
      const mediaLibrary = await loadMediaLibrary()
      const permission = await mediaLibrary.requestPermissionsAsync(true)
      if (!permission.granted) throw new Error('ไม่ได้รับสิทธิ์บันทึกลงคลังรูป')
      await mediaLibrary.saveToLibraryAsync(ctx.videoUri)
      track({
        name: 'run_replay_video_export_succeeded',
        properties: { method: 'save_video', duration_ms: Date.now() - startedAt },
      })
    } catch (err) {
      const reason = readableError(err, 'export_failed')
      track({ name: 'run_replay_video_export_failed', properties: { method: 'save_video', reason } })
      if (reason === 'ไม่ได้รับสิทธิ์บันทึกลงคลังรูป') {
        track({ name: 'run_replay_video_export_abandoned', properties: { reason: 'permission_denied' } })
      }
    } finally {
      setBusy(false)
    }
  }, [ctx.videoUri, track])

  const shareToInstagram = useCallback(async () => {
    if (!ctx.videoUri || Platform.OS !== 'android') return
    setBusy(true)
    track({ name: 'run_replay_video_export_attempted', properties: { method: 'instagram_story' } })
    const startedAt = Date.now()
    try {
      const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID
      if (!appId) throw new Error('ยังไม่ได้ตั้งค่าแชร์ Instagram')
      const instagramShare = await loadInstagramShare()
      await instagramShare.shareSingle({
        social: instagramShare.instagramStories,
        appId,
        backgroundVideo: ctx.videoUri,
      })
      track({
        name: 'run_replay_video_export_succeeded',
        properties: { method: 'instagram_story', duration_ms: Date.now() - startedAt },
      })
    } catch (err) {
      track({
        name: 'run_replay_video_export_failed',
        properties: { method: 'instagram_story', reason: readableError(err, 'export_failed') },
      })
    } finally {
      setBusy(false)
    }
  }, [ctx.videoUri, track])

  const reset = useCallback(() => {
    clearCountdownInterval()
    const videoUri = ctxRef.current.videoUri
    if (videoUri) void deleteVideoFile(videoUri)
    setCtx((c) => replayRecordingReducer(c, { type: 'RESET' }))
    setCountdownValue(COUNTDOWN_FROM)
  }, [clearCountdownInterval])

  const errorMessage = ctx.failReason
    ? ctx.failReason === 'permission_denied'
      ? permissionDeniedError
      : ctx.failReason === 'recorder_unavailable'
        ? recorderUnavailableError
        : 'บันทึกวิดีโอไม่สำเร็จ ลองใหม่อีกครั้ง'
    : null

  return {
    state: ctx.state,
    chromeHidden: computeChromeHidden(ctx),
    isCapturing: computeIsCapturing(ctx),
    countdownValue,
    videoUri: ctx.videoUri,
    errorMessage,
    busy,
    begin,
    onFinaleComplete,
    shareVideo,
    saveVideo,
    shareToInstagram,
    reset,
  }
}
