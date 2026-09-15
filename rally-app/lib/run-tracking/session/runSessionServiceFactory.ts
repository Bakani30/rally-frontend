import { systemClock } from '@/lib/clock'
import { cryptoIdGenerator } from '@/lib/idGen'
import * as Device from 'expo-device'
import { appStatePort } from '../gps/appStatePort'
import { batteryPort } from '../gps/batteryPort'
import { expoLocationTracker } from '../gps/expoLocationTracker'
import {
  mockRunLocationProvider,
  setMockRunRouteFixture,
  type MockRunRoutePoint,
} from '../gps/mockRunLocationProvider'
import { sqliteSessionBuffer } from '../offline/sessionBufferAdapter'
import { createGpsLiveSource } from '../sources/gpsLiveSource'
import { expoPedometerStepSource } from '../sources/expoPedometerStepSource'
import { loadSession } from '../offline/sessionBuffer'
import {
  RunSessionService,
  type RunSessionServiceDeps,
  type SubmitDeps,
} from './runSessionService'
import { computeSubmitBodyMetrics } from './computeSubmitBodyMetrics'
import { submitRunSession } from './runSessionRepository'
import { useRunSessionStore } from './runSessionStore'
import {
  requestedRunLocationProviderKind,
  resolveRunLocationProviderKind,
  type RunLocationProvider,
  type RunLocationProviderKind,
} from './runLocationProvider'

/**
 * Factory for `RunSessionService`. Wires the four production ports (tracker,
 * buffer, clock, idGen) and exposes a small set of helpers so app code never
 * touches port plumbing directly.
 *
 * Boundary intent (per CLAUDE.md §2.5):
 *   - Service: orchestration logic only — no expo-*, no supabase imports.
 *   - Adapters: own a single native dependency each.
 *   - Factory: the ONLY module that imports both layers. App code calls into
 *     the factory; tests bypass it and inject ports via `RunSessionService`
 *     directly (see runSessionService.test.ts).
 *
 * Usage:
 *   const service = getRunSessionService()
 *   await service.start()
 *   ...
 *   await service.stop()
 *   const result = await service.submit(sessionId, makeSubmitDeps(sessionId))
 */

let cachedService: RunSessionService | null = null
let lifecycleSubscribed = false

/**
 * Foreground poll cadence. Matches the 1Hz GPS sample rate so the live route
 * grows at the same pace fixes arrive — see RunSessionService.pollBackgroundSamples.
 */
const RUN_FOREGROUND_POLL_MS = 1000

/**
 * Module-singleton accessor for the production service. The first call wires
 * real adapters; subsequent calls return the same instance. Reset is
 * intentionally not exposed — there's only ever one active session per
 * device, and the service guards against double-start internally.
 */
export function getRunSessionService(): RunSessionService {
  if (!cachedService) {
    cachedService = new RunSessionService(productionDeps())
    subscribeLifecycle(cachedService)
  }
  return cachedService
}

/**
 * Wire AppState + Battery into the service exactly once per process. The
 * subscriptions live for the lifetime of the JS instance — fine because the
 * service is a singleton and the app has at most one active session.
 */
function subscribeLifecycle(service: RunSessionService): void {
  if (lifecycleSubscribed) return
  lifecycleSubscribed = true

  // Lifecycle observers fire from outside any user-driven async chain, so a
  // platform error inside (Android 14 forbidding fg-service start while bg,
  // or expo-location throwing during stop) bubbles up as an UNHANDLED
  // promise rejection and the dev menu shows it as a console error. Wrap
  // every fire-and-forget call so the runtime stays clean — analytics is
  // already where these are tracked downstream of the service.
  const safeAppState = (state: ReturnType<typeof appStatePort.current>) => {
    service.onAppStateChange(state).catch((err) => {
      console.warn('[run-tracking] onAppStateChange failed', err)
    })
  }
  const safeBattery = (snap: Parameters<typeof service.onBatteryChange>[0]) => {
    service.onBatteryChange(snap).catch((err) => {
      console.warn('[run-tracking] onBatteryChange failed', err)
    })
  }

  // Seed initial state.
  safeAppState(appStatePort.current())
  batteryPort.getSnapshot()
    .then(safeBattery)
    .catch((err) => console.warn('[run-tracking] battery snapshot failed', err))

  appStatePort.subscribe(safeAppState)
  batteryPort.subscribe(safeBattery)

  // Live foreground poll. Some Android OEMs (e.g. MIUI) route GPS fixes to the
  // background fg-service task instead of the foreground watch, so samples land
  // in sqlite and the live route freezes until stop() drains them. Polling
  // pollBackgroundSamples while a session is active surfaces those fixes in
  // real time. Runs only while status === 'active' — no idle timer.
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const syncPoll = (status: ReturnType<typeof useRunSessionStore.getState>['status']) => {
    if (status === 'active' && !pollTimer) {
      pollTimer = setInterval(() => {
        service.pollBackgroundSamples().catch((err) =>
          console.warn('[run-tracking] pollBackgroundSamples failed', err),
        )
      }, RUN_FOREGROUND_POLL_MS)
    } else if (status !== 'active' && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
  syncPoll(useRunSessionStore.getState().status)
  useRunSessionStore.subscribe((state) => syncPoll(state.status))
}

/**
 * Factory variant for callers that need a fresh service with port overrides
 * (e.g. integration tests, Storybook stories, dev tooling). Production code
 * should use `getRunSessionService()` instead.
 */
export function createRunSessionService(
  overrides: Partial<RunSessionServiceDeps> = {},
): RunSessionService {
  return new RunSessionService({ ...productionDeps(), ...overrides })
}

/**
 * Build SubmitDeps for `service.submit(sessionId, deps)`. Wraps
 * `createGpsLiveSource` over the buffer's `loadSession` and the supabase
 * repository's `submitRunSession`. Override either field for tests or
 * alternate sources (e.g. healthkit in Phase 2).
 */
export function makeSubmitDeps(
  sessionId: string,
  options: Partial<SubmitDeps> & { matchId?: string | null; challengeId?: string | null } = {},
): SubmitDeps {
  const { matchId, challengeId, ...overrides } = options
  const liveState = useRunSessionStore.getState()
  const source =
    overrides.source ??
    withStepMetrics(
      withWearMetrics(createGpsLiveSource(sessionId, { loadSession }), {
        sessionId,
        avgHeartRate: liveState.sessionId === sessionId ? liveState.avgHeartRate : null,
      }),
      { sessionId, steps: liveState.sessionId === sessionId ? liveState.steps : null },
    )
  // Body summary (HR zones/intensity/cadence) is computed right before the
  // edge invoke — best-effort with a single ~3s cap on the whole computation; on any failure the
  // run submits without it (display-only, never blocks evidence). Lives here
  // rather than in RunSessionService because the service is port-pure and the
  // factory is the only module allowed to touch native adapters.
  const submit =
    overrides.submit ??
    (async (input) => {
      const bodyMetrics = await computeSubmitBodyMetrics({
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        distanceMeters: input.distanceMeters,
        pausedDurationSeconds: input.pausedDurationSeconds,
        fallbackSteps: input.steps ?? null,
        deviceCalories: null,
      })
      return submitRunSession({
        ...input,
        bodyMetrics,
        matchId: matchId ?? undefined,
        challengeId: challengeId ?? undefined,
      })
    })
  return { source, submit }
}

function withWearMetrics(
  source: ReturnType<typeof createGpsLiveSource>,
  metrics: { sessionId: string; avgHeartRate: number | null },
): ReturnType<typeof createGpsLiveSource> {
  return {
    ...source,
    async produce() {
      const session = await source.produce()
      if (!metrics.avgHeartRate) return session
      return {
        ...session,
        avgHeartRate: metrics.avgHeartRate,
        integrityFlags: Array.from(new Set([
          ...session.integrityFlags,
          'wear_os_companion',
          'health_services_hr',
        ])),
      }
    },
  }
}

// Known accepted limitation (mirrors withWearMetrics/avgHeartRate above): the
// offline retry path (retrySessionSubmitter -> makeSubmitDeps with an empty
// store) reads `steps` from the live Zustand store, which is empty on that
// path — so a retried submit loses the step count, same as it already loses
// avgHeartRate. Not persisted to SQLite by design (see approved design doc).
function withStepMetrics(
  source: ReturnType<typeof createGpsLiveSource>,
  metrics: { sessionId: string; steps: number | null },
): ReturnType<typeof createGpsLiveSource> {
  return {
    ...source,
    async produce() {
      const session = await source.produce()
      if (metrics.steps == null) return session
      return {
        ...session,
        steps: metrics.steps,
      }
    },
  }
}

function productionDeps(): RunSessionServiceDeps {
  return {
    tracker: getRunLocationProvider(),
    buffer: sqliteSessionBuffer,
    store: useRunSessionStore,
    clock: systemClock,
    idGen: cryptoIdGenerator,
    stepSource: expoPedometerStepSource,
  }
}

export function getRunLocationProviderKind(): RunLocationProviderKind {
  return resolveRunLocationProviderKind({
    requested: requestedRunLocationProviderKind(),
    isDevice: Device.isDevice,
  })
}

export function setSimulatorRunRouteFixture(route: readonly MockRunRoutePoint[]): void {
  if (getRunLocationProviderKind() !== 'mock') return
  setMockRunRouteFixture(route)
}

function getRunLocationProvider(): RunLocationProvider {
  return getRunLocationProviderKind() === 'mock'
    ? mockRunLocationProvider
    : expoLocationTracker
}
