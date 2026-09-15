import { describe, expect, it } from 'vitest'

import { defaultReplayMapProvider, toggleReplayMapProvider } from './replayMapProvider'

describe('replay map provider', () => {
  it('defaults iOS replay to Apple MapKit', () => {
    expect(defaultReplayMapProvider('ios')).toBe('apple')
  })

  it('keeps Android and web replay on MapLibre', () => {
    expect(defaultReplayMapProvider('android')).toBe('maplibre')
    expect(defaultReplayMapProvider('web')).toBe('maplibre')
    expect(toggleReplayMapProvider('android', 'apple')).toBe('maplibre')
  })

  it('toggles Apple and MapLibre only on iOS', () => {
    expect(toggleReplayMapProvider('ios', 'apple')).toBe('maplibre')
    expect(toggleReplayMapProvider('ios', 'maplibre')).toBe('apple')
  })
})
