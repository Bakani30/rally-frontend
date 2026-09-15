import { describe, expect, it, vi } from 'vitest'
import {
  createMockRunRouteFixture,
  interpolateMockRoute,
  MockRunLocationProvider,
  routeLengthMeters,
  setMockRunRouteFixture,
} from './mockRunLocationProvider'
import { haversineMeters } from './gpsDistance'
import { configForMode } from './gpsAccuracyMode'
import { createHeartRouteFixture } from '../routes/heartRouteFixture'

describe('mock run route fixture', () => {
  it('creates a closed loop with realistic segment lengths', () => {
    const route = createMockRunRouteFixture({ lat: 13.7563, lng: 100.5018 }, 400)
    expect(route[route.length - 1]).toEqual(route[0])
    expect(routeLengthMeters(route)).toBeGreaterThan(1500)
    expect(routeLengthMeters(route)).toBeLessThan(1700)
  })

  it('creates a compact heart loop for simulator smoke runs', () => {
    const route = createHeartRouteFixture({ lat: 13.7563, lng: 100.5018 }, 220, 80)
    expect(route).toHaveLength(80)
    expect(haversineMeters(route[0], route[route.length - 1])).toBeLessThan(2)
    expect(routeLengthMeters(route)).toBeGreaterThan(600)
    expect(routeLengthMeters(route)).toBeLessThan(800)
  })

  it('interpolates along the route without jumping at loop wrap', () => {
    const route = createMockRunRouteFixture({ lat: 13.7563, lng: 100.5018 }, 400)
    const total = routeLengthMeters(route)
    const nearEnd = interpolateMockRoute(route, total - 2)
    const wrapped = interpolateMockRoute(route, total + 2)
    expect(haversineMeters(nearEnd, wrapped)).toBeLessThan(5)
  })
})

describe('MockRunLocationProvider', () => {
  it('emits a mocked first sample immediately on start', async () => {
    const now = vi.fn(() => 1_700_000_000_000)
    const provider = new MockRunLocationProvider({ now })
    const samples: unknown[] = []

    await provider.start((sample) => samples.push(sample), configForMode('foreground_active'))
    await provider.stop()

    expect(samples).toHaveLength(1)
    expect(samples[0]).toMatchObject({
      accuracy: 6,
      speed: 3.2,
      timestamp: 1_700_000_000_000,
      mocked: true,
    })
  })

  it('can swap the simulator route before a session starts', async () => {
    const now = vi.fn(() => 1_700_000_000_000)
    const route = [
      { lat: 13.7563, lng: 100.5018 },
      { lat: 13.7564, lng: 100.5018 },
    ]
    const provider = new MockRunLocationProvider({ now })
    provider.setRoute(route)

    const samples: unknown[] = []
    await provider.start((sample) => samples.push(sample), configForMode('foreground_active'))
    await provider.stop()

    expect(samples[0]).toMatchObject(route[0])
  })

  it('keeps the exported singleton configurable for simulator smoke screens', () => {
    expect(() => setMockRunRouteFixture(createHeartRouteFixture())).not.toThrow()
  })
})
