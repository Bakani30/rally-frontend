import type { TrackerConfig } from './gpsAccuracyMode'
import { haversineMeters } from './gpsDistance'
import type {
  GpsRawSample,
} from '../session/runSessionPorts'
import type { RunLocationProvider } from '../session/runLocationProvider'
import { createHeartRouteFixture } from '../routes/heartRouteFixture'
import {
  degradedWalkerSampleAt,
  parseMockScenario,
  type MockScenarioKind,
} from './mockRunScenario'

export type MockRunRoutePoint = {
  lat: number
  lng: number
}

export type MockRunLocationProviderOptions = {
  route?: readonly MockRunRoutePoint[]
  speedMps?: number
  accuracyM?: number
  now?: () => number
  /** Degraded-signal scenario overriding speed/accuracy — see mockRunScenario.ts. */
  scenario?: MockScenarioKind | null
}

const BANGKOK_START: MockRunRoutePoint = {
  lat: 13.7563,
  lng: 100.5018,
}

const DEFAULT_LOOP_EDGE_M = 400
const DEFAULT_SPEED_MPS = 3.2
const DEFAULT_ACCURACY_M = 6

export function createMockRunRouteFixture(
  start: MockRunRoutePoint = BANGKOK_START,
  edgeMeters = DEFAULT_LOOP_EDGE_M,
): MockRunRoutePoint[] {
  const north = metersNorth(start, edgeMeters)
  const east = metersEast(start, edgeMeters)
  return [
    start,
    { lat: start.lat, lng: start.lng + east },
    { lat: start.lat + north, lng: start.lng + east },
    { lat: start.lat + north, lng: start.lng },
    start,
  ]
}

export function routeLengthMeters(route: readonly MockRunRoutePoint[]): number {
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversineMeters(route[i - 1], route[i])
  }
  return total
}

export function interpolateMockRoute(
  route: readonly MockRunRoutePoint[],
  distanceMeters: number,
): MockRunRoutePoint {
  if (route.length === 0) return BANGKOK_START
  if (route.length === 1) return route[0]

  const total = routeLengthMeters(route)
  if (total <= 0) return route[0]

  let remaining = positiveModulo(distanceMeters, total)
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1]
    const to = route[i]
    const segment = haversineMeters(from, to)
    if (segment <= 0) continue
    if (remaining <= segment) {
      const t = remaining / segment
      return {
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      }
    }
    remaining -= segment
  }

  return route[route.length - 1]
}

export class MockRunLocationProvider implements RunLocationProvider {
  private route: readonly MockRunRoutePoint[]
  private readonly speedMps: number
  private readonly accuracyM: number
  private readonly now: () => number
  private readonly scenario: MockScenarioKind | null
  private activeTimer: ReturnType<typeof setInterval> | null = null
  private warmTimer: ReturnType<typeof setInterval> | null = null
  private onSample: ((sample: GpsRawSample) => void) | null = null
  private warmOnSample: ((sample: GpsRawSample) => void) | null = null
  private startedAtMs: number | null = null
  private activeIntervalMs = 1000

  constructor(options: MockRunLocationProviderOptions = {}) {
    this.route = options.route ?? createHeartRouteFixture()
    this.speedMps = options.speedMps ?? DEFAULT_SPEED_MPS
    this.accuracyM = options.accuracyM ?? DEFAULT_ACCURACY_M
    this.now = options.now ?? (() => Date.now())
    this.scenario = options.scenario ?? null
  }

  setRoute(route: readonly MockRunRoutePoint[]): void {
    if (route.length < 2 || this.onSample) return
    this.route = route
  }

  async warmUp(onSample: (sample: GpsRawSample) => void): Promise<void> {
    if (this.onSample || this.warmTimer) return
    this.warmOnSample = onSample
    this.emitWarmSample()
    this.warmTimer = setInterval(() => this.emitWarmSample(), 1000)
  }

  async cancelWarmUp(): Promise<void> {
    if (this.warmTimer) {
      clearInterval(this.warmTimer)
      this.warmTimer = null
    }
    this.warmOnSample = null
  }

  async start(
    onSample: (sample: GpsRawSample) => void,
    config: TrackerConfig,
  ): Promise<void> {
    if (this.onSample) {
      throw new Error('MockRunLocationProvider.start: subscription already active')
    }

    await this.cancelWarmUp()
    this.onSample = onSample
    this.startedAtMs = this.now()
    this.activeIntervalMs = config.timeIntervalMs
    this.emitActiveSample()
    this.activeTimer = setInterval(() => this.emitActiveSample(), this.activeIntervalMs)
  }

  async setMode(config: TrackerConfig): Promise<void> {
    if (!this.onSample) return
    this.activeIntervalMs = config.timeIntervalMs
    if (this.activeTimer) {
      clearInterval(this.activeTimer)
    }
    this.activeTimer = setInterval(() => this.emitActiveSample(), this.activeIntervalMs)
  }

  async stop(): Promise<void> {
    if (this.activeTimer) {
      clearInterval(this.activeTimer)
      this.activeTimer = null
    }
    this.onSample = null
    this.startedAtMs = null
  }

  private emitWarmSample(): void {
    this.warmOnSample?.(this.sampleAt(this.now(), 0))
  }

  private emitActiveSample(): void {
    const timestamp = this.now()
    const elapsedMs = Math.max(0, timestamp - (this.startedAtMs ?? timestamp))
    this.onSample?.(this.sampleAt(timestamp, elapsedMs))
  }

  private sampleAt(timestamp: number, elapsedMs: number): GpsRawSample {
    if (this.scenario === 'degraded_walker') {
      const s = degradedWalkerSampleAt(elapsedMs)
      const point = interpolateMockRoute(this.route, s.movedMeters)
      return {
        lat: point.lat,
        lng: point.lng,
        accuracy: s.accuracyM,
        altitude: null,
        speed: s.speedMps,
        heading: null,
        timestamp,
        mocked: true,
      }
    }
    const point = interpolateMockRoute(
      this.route,
      (elapsedMs / 1000) * this.speedMps,
    )
    return {
      lat: point.lat,
      lng: point.lng,
      accuracy: this.accuracyM,
      altitude: null,
      speed: this.speedMps,
      heading: null,
      timestamp,
      mocked: true,
    }
  }
}

function metersNorth(_start: MockRunRoutePoint, meters: number): number {
  return meters / 111_320
}

function metersEast(start: MockRunRoutePoint, meters: number): number {
  const latRad = (start.lat * Math.PI) / 180
  return meters / (111_320 * Math.cos(latRad))
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo
}

export const mockRunLocationProvider: RunLocationProvider =
  new MockRunLocationProvider({
    scenario: parseMockScenario(process.env.EXPO_PUBLIC_RUN_MOCK_SCENARIO),
  })

export function setMockRunRouteFixture(route: readonly MockRunRoutePoint[]): void {
  if (mockRunLocationProvider instanceof MockRunLocationProvider) {
    mockRunLocationProvider.setRoute(route)
  }
}
