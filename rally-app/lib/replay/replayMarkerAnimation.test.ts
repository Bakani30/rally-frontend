import { describe, expect, it } from 'vitest'

import { interpolateReplayMarkerCoordinate } from './replayMarkerAnimation'

describe('interpolateReplayMarkerCoordinate', () => {
  it('returns the start coordinate at the beginning', () => {
    expect(interpolateReplayMarkerCoordinate([100, 13], [101, 14], 0)).toEqual([100, 13])
  })

  it('returns the midpoint while a marker is moving', () => {
    expect(interpolateReplayMarkerCoordinate([100, 13], [101, 14], 0.5)).toEqual([100.5, 13.5])
  })

  it('returns the target coordinate when the transition completes', () => {
    expect(interpolateReplayMarkerCoordinate([100, 13], [101, 14], 1)).toEqual([101, 14])
  })

  it('handles marker appearance and removal without producing invalid coordinates', () => {
    expect(interpolateReplayMarkerCoordinate(null, [101, 14], 0.5)).toEqual([101, 14])
    expect(interpolateReplayMarkerCoordinate([100, 13], null, 0.5)).toEqual([100, 13])
    expect(interpolateReplayMarkerCoordinate([100, 13], null, 1)).toBeNull()
  })
})
