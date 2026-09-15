import { describe, expect, it } from 'vitest'
import { MAX_PROOF_CLIP_SECONDS, shouldAutoStopRecording } from './recordingAutoStop'

describe('shouldAutoStopRecording', () => {
  it('does not stop below the cap', () => {
    expect(shouldAutoStopRecording(0, true)).toBe(false)
    expect(shouldAutoStopRecording(59, true)).toBe(false)
  })

  it('stops at and beyond the cap while recording', () => {
    expect(shouldAutoStopRecording(60, true)).toBe(true)
    expect(shouldAutoStopRecording(61, true)).toBe(true)
  })

  it('never stops when not recording', () => {
    expect(shouldAutoStopRecording(60, false)).toBe(false)
  })

  it('exposes a 60-second cap', () => {
    expect(MAX_PROOF_CLIP_SECONDS).toBe(60)
  })

  it('uses a quest-specific duration when one is provided', () => {
    expect(shouldAutoStopRecording(299, true, 300)).toBe(false)
    expect(shouldAutoStopRecording(300, true, 300)).toBe(true)
  })
})
