import { describe, expect, it } from 'vitest'

import {
  initialReplayIntroPhase,
  nextReplayIntroPhase,
  shouldAdvanceReplayProgress,
} from './replayIntro'

describe('replay intro phases', () => {
  it('waits for native warm-up only for the iOS Apple provider', () => {
    expect(initialReplayIntroPhase('ios', 'apple')).toBe('preloading')
    expect(initialReplayIntroPhase('ios', 'maplibre')).toBe('chase')
    expect(initialReplayIntroPhase('android', 'maplibre')).toBe('chase')
  })

  it('moves from warm-up through overview and dive into chase', () => {
    expect(nextReplayIntroPhase('preloading')).toBe('overview')
    expect(nextReplayIntroPhase('overview')).toBe('dive')
    expect(nextReplayIntroPhase('dive')).toBe('chase')
    expect(nextReplayIntroPhase('chase')).toBe('chase')
  })

  it('advances route progress only during chase', () => {
    expect(shouldAdvanceReplayProgress('preloading')).toBe(false)
    expect(shouldAdvanceReplayProgress('overview')).toBe(false)
    expect(shouldAdvanceReplayProgress('dive')).toBe(false)
    expect(shouldAdvanceReplayProgress('chase')).toBe(true)
  })
})
