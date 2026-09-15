import { describe, expect, it } from 'vitest'

import {
  canFinalizeRecording,
  chromeHidden,
  initialReplayRecording,
  isCapturing,
  replayRecordingReducer,
  type ReplayRecordingContext,
  type ReplayRecordingFailReason,
  type ReplayRecordingState,
} from './replayRecording'

describe('replayRecordingReducer', () => {
  it('starts at idle with defaults', () => {
    const ctx = initialReplayRecording()
    expect(ctx).toEqual({ state: 'idle', countdownFrom: 3, videoUri: null, failReason: null })
  })

  it('honours a custom countdownFrom', () => {
    expect(initialReplayRecording(5).countdownFrom).toBe(5)
  })

  it('walks the full happy path: idle -> countdown -> recording -> processing -> ready', () => {
    let ctx = initialReplayRecording()
    ctx = replayRecordingReducer(ctx, { type: 'START' })
    expect(ctx.state).toBe('countdown')

    ctx = replayRecordingReducer(ctx, { type: 'COUNTDOWN_DONE' })
    expect(ctx.state).toBe('recording')

    ctx = replayRecordingReducer(ctx, { type: 'FINALE_COMPLETE' })
    expect(ctx.state).toBe('processing')

    ctx = replayRecordingReducer(ctx, { type: 'RECORDED', uri: 'file:///replay.mov' })
    expect(ctx.state).toBe('ready')
    expect(ctx.videoUri).toBe('file:///replay.mov')
  })

  it('RESET returns to idle and clears uri + failReason from any state', () => {
    const states: ReplayRecordingState[] = ['idle', 'countdown', 'recording', 'processing', 'ready', 'failed']
    for (const state of states) {
      const ctx: ReplayRecordingContext = {
        state,
        countdownFrom: 3,
        videoUri: 'file:///x.mov',
        failReason: 'capture_failed',
      }
      const next = replayRecordingReducer(ctx, { type: 'RESET' })
      expect(next).toEqual({ state: 'idle', countdownFrom: 3, videoUri: null, failReason: null })
    }
  })

  describe('FAIL', () => {
    const reasons: ReplayRecordingFailReason[] = [
      'permission_denied',
      'recorder_unavailable',
      'interrupted',
      'storage_full',
      'user_cancelled',
      'capture_failed',
      'unknown',
    ]

    it('is legal from idle (permission denial at begin) and sets the reason', () => {
      for (const reason of reasons) {
        const ctx = initialReplayRecording()
        const next = replayRecordingReducer(ctx, { type: 'FAIL', reason })
        expect(next.state).toBe('failed')
        expect(next.failReason).toBe(reason)
      }
    })

    it('is legal from countdown/recording/processing/ready and sets the reason', () => {
      const states: ReplayRecordingState[] = ['countdown', 'recording', 'processing', 'ready']
      for (const state of states) {
        for (const reason of reasons) {
          const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
          const next = replayRecordingReducer(ctx, { type: 'FAIL', reason })
          expect(next.state).toBe('failed')
          expect(next.failReason).toBe(reason)
        }
      }
    })

    it('is a no-op once already failed', () => {
      const ctx: ReplayRecordingContext = {
        state: 'failed',
        countdownFrom: 3,
        videoUri: null,
        failReason: 'capture_failed',
      }
      const next = replayRecordingReducer(ctx, { type: 'FAIL', reason: 'storage_full' })
      expect(next).toBe(ctx)
    })
  })

  describe('illegal transitions are no-ops', () => {
    it('RECORDED while idle does nothing', () => {
      const ctx = initialReplayRecording()
      const next = replayRecordingReducer(ctx, { type: 'RECORDED', uri: 'file:///x.mov' })
      expect(next).toBe(ctx)
    })

    it('START while not idle does nothing', () => {
      const states: ReplayRecordingState[] = ['countdown', 'recording', 'processing', 'ready', 'failed']
      for (const state of states) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        const next = replayRecordingReducer(ctx, { type: 'START' })
        expect(next).toBe(ctx)
      }
    })

    it('COUNTDOWN_DONE outside countdown does nothing', () => {
      const states: ReplayRecordingState[] = ['idle', 'recording', 'processing', 'ready', 'failed']
      for (const state of states) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        const next = replayRecordingReducer(ctx, { type: 'COUNTDOWN_DONE' })
        expect(next).toBe(ctx)
      }
    })

    it('FINALE_COMPLETE outside recording does nothing', () => {
      const states: ReplayRecordingState[] = ['idle', 'countdown', 'processing', 'ready', 'failed']
      for (const state of states) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        const next = replayRecordingReducer(ctx, { type: 'FINALE_COMPLETE' })
        expect(next).toBe(ctx)
      }
    })

    it('RECORDED outside processing does nothing', () => {
      const states: ReplayRecordingState[] = ['countdown', 'recording', 'ready', 'failed']
      for (const state of states) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        const next = replayRecordingReducer(ctx, { type: 'RECORDED', uri: 'file:///x.mov' })
        expect(next).toBe(ctx)
      }
    })
  })

  describe('chromeHidden truth table', () => {
    it('is true only for countdown and recording', () => {
      const table: [ReplayRecordingState, boolean][] = [
        ['idle', false],
        ['countdown', true],
        ['recording', true],
        ['processing', false],
        ['ready', false],
        ['failed', false],
      ]
      for (const [state, expected] of table) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        expect(chromeHidden(ctx)).toBe(expected)
      }
    })
  })

  describe('isCapturing truth table', () => {
    it('is true for countdown, recording and processing', () => {
      const table: [ReplayRecordingState, boolean][] = [
        ['idle', false],
        ['countdown', true],
        ['recording', true],
        ['processing', true],
        ['ready', false],
        ['failed', false],
      ]
      for (const [state, expected] of table) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        expect(isCapturing(ctx)).toBe(expected)
      }
    })
  })

  describe('canFinalizeRecording truth table', () => {
    it('is true only after native recording has started', () => {
      const states: ReplayRecordingState[] = ['idle', 'countdown', 'recording', 'processing', 'ready', 'failed']
      for (const state of states) {
        const ctx: ReplayRecordingContext = { state, countdownFrom: 3, videoUri: null, failReason: null }
        expect(canFinalizeRecording(ctx)).toBe(state === 'recording')
      }
    })
  })
})
