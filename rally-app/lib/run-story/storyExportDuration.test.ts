import { describe, expect, it } from 'vitest'

import {
  MAX_STORY_EXPORT_DURATION_MS,
  MIN_STORY_EXPORT_DURATION_MS,
  clampStoryExportDurationMs,
} from './storyExportDuration'

describe('clampStoryExportDurationMs', () => {
  it('falls back to the default when the source duration is unknown', () => {
    expect(clampStoryExportDurationMs(null)).toBe(6_000)
  })

  it('falls back to the default for non-finite or non-positive input', () => {
    expect(clampStoryExportDurationMs(0)).toBe(6_000)
    expect(clampStoryExportDurationMs(-2)).toBe(6_000)
    expect(clampStoryExportDurationMs(Number.NaN)).toBe(6_000)
  })

  it('floors very short clips at the minimum', () => {
    expect(clampStoryExportDurationMs(1)).toBe(MIN_STORY_EXPORT_DURATION_MS)
  })

  it('caps very long clips at the maximum', () => {
    expect(clampStoryExportDurationMs(30)).toBe(MAX_STORY_EXPORT_DURATION_MS)
  })

  it('uses the source duration unchanged when already in range', () => {
    expect(clampStoryExportDurationMs(8)).toBe(8_000)
  })
})
