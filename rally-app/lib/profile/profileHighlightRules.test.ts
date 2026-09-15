import { describe, expect, it } from 'vitest'
import {
  PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS,
  validateProfileHighlightDuration,
} from './profileHighlightRules'

describe('validateProfileHighlightDuration', () => {
  it('accepts a clip at the 45 second limit', () => {
    expect(validateProfileHighlightDuration(PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS * 1000)).toEqual({
      accepted: true,
      durationSeconds: PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS,
    })
  })

  it('rejects clips longer than 45 seconds without trimming', () => {
    expect(validateProfileHighlightDuration(45_001)).toEqual({ accepted: false, reason: 'too_long' })
  })

  it('rejects clips whose duration cannot be read', () => {
    expect(validateProfileHighlightDuration(null)).toEqual({ accepted: false, reason: 'missing_duration' })
  })
})
