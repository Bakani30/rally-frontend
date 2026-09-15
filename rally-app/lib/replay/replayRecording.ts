/**
 * Pure state machine for the 3D run-replay video-recording flow. No
 * React/native imports — safe to unit-test. hooks/useReplayVideoShare.ts
 * drives this reducer and bridges it to expo-screen-recorder + share/save.
 *
 * Flow: idle -[START]-> countdown -[COUNTDOWN_DONE]-> recording
 *   -[FINALE_COMPLETE]-> processing -[RECORDED]-> ready
 * FAIL is legal from any non-idle state (and from idle, for permission
 * denial at the very start of begin()) and always lands on 'failed'.
 * RESET returns to idle from any state.
 */

export type ReplayRecordingState =
  | 'idle'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'failed'

export type ReplayRecordingFailReason =
  | 'permission_denied'
  | 'recorder_unavailable'
  | 'interrupted'
  | 'storage_full'
  | 'user_cancelled'
  | 'capture_failed'
  | 'unknown'

export type ReplayRecordingContext = {
  state: ReplayRecordingState
  countdownFrom: number
  videoUri: string | null
  failReason: ReplayRecordingFailReason | null
}

export type ReplayRecordingEvent =
  | { type: 'START' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'FINALE_COMPLETE' }
  | { type: 'RECORDED'; uri: string }
  | { type: 'FAIL'; reason: ReplayRecordingFailReason }
  | { type: 'RESET' }

export function initialReplayRecording(countdownFrom = 3): ReplayRecordingContext {
  return { state: 'idle', countdownFrom, videoUri: null, failReason: null }
}

export function replayRecordingReducer(
  ctx: ReplayRecordingContext,
  event: ReplayRecordingEvent,
): ReplayRecordingContext {
  switch (event.type) {
    case 'START':
      return ctx.state === 'idle' ? { ...ctx, state: 'countdown' } : ctx
    case 'COUNTDOWN_DONE':
      return ctx.state === 'countdown' ? { ...ctx, state: 'recording' } : ctx
    case 'FINALE_COMPLETE':
      return ctx.state === 'recording' ? { ...ctx, state: 'processing' } : ctx
    case 'RECORDED':
      return ctx.state === 'processing'
        ? { ...ctx, state: 'ready', videoUri: event.uri }
        : ctx
    case 'FAIL':
      return ctx.state === 'idle' || ctx.state !== 'failed'
        ? { ...ctx, state: 'failed', failReason: event.reason }
        : ctx
    case 'RESET':
      return { ...ctx, state: 'idle', videoUri: null, failReason: null }
    default:
      return ctx
  }
}

export function chromeHidden(ctx: ReplayRecordingContext): boolean {
  return ctx.state === 'countdown' || ctx.state === 'recording'
}

export function isCapturing(ctx: ReplayRecordingContext): boolean {
  return ctx.state === 'countdown' || ctx.state === 'recording' || ctx.state === 'processing'
}

/** Native stop is valid only after startRecording has resolved. */
export function canFinalizeRecording(ctx: ReplayRecordingContext): boolean {
  return ctx.state === 'recording'
}
