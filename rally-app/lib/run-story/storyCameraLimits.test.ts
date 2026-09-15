import { describe, expect, it } from 'vitest'

import { MAX_STORY_VIDEO_RECORD_SECONDS, hasReachedMaxRecordSeconds } from './storyCameraLimits'

describe('hasReachedMaxRecordSeconds', () => {
  it('is false below the default max', () => {
    expect(hasReachedMaxRecordSeconds(14)).toBe(false)
  })

  it('is true at the default max', () => {
    expect(hasReachedMaxRecordSeconds(MAX_STORY_VIDEO_RECORD_SECONDS)).toBe(true)
  })

  it('is true beyond the default max', () => {
    expect(hasReachedMaxRecordSeconds(20)).toBe(true)
  })

  it('honours a custom max', () => {
    expect(hasReachedMaxRecordSeconds(5, 5)).toBe(true)
    expect(hasReachedMaxRecordSeconds(4, 5)).toBe(false)
  })
})
