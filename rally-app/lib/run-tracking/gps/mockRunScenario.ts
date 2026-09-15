/**
 * Deterministic mock-GPS scenarios for simulator testing.
 *
 * The default mock provider emits ideal fixes (6m accuracy, constant runner
 * speed) — great for demoing the happy path, useless for reproducing field
 * failures. A scenario replaces the mock's movement + accuracy profile so the
 * whole live pipeline (hygiene → Kalman → auto-pause → distance → notices)
 * can be watched on-screen under realistic degraded conditions.
 *
 * Select via env: EXPO_PUBLIC_RUN_MOCK_SCENARIO=degraded_walker
 * (only honored where the mock provider itself is active — simulators).
 */

export type MockScenarioKind = 'degraded_walker'

export type MockScenarioSample = {
  /** Cumulative meters moved along the route at this instant. */
  movedMeters: number
  /** Reported accuracy for this fix (meters). */
  accuracyM: number
  /**
   * OS-reported speed. The degraded scenario always reports null — matching
   * distance-filtered power-save fixes, which is what starved the fast-resume
   * path in the 2026-07-10 field incident.
   */
  speedMps: number | null
}

type ScenarioPhase = {
  seconds: number
  walkSpeedMps: number
  accuracyBand: [number, number]
}

/**
 * Mirrors the 2026-07-10 incident (and the runSessionFieldReplay test):
 * clear walk → standstill at a crossing (auto-pause should latch) → walk
 * into a 40s building-shadow stretch at 26–34m accuracy (distance must keep
 * counting, pause must release, no GPS-lost banner) → clear walk. Loops.
 */
const DEGRADED_WALKER_PHASES: ScenarioPhase[] = [
  { seconds: 60, walkSpeedMps: 1.2, accuracyBand: [15, 22] },
  { seconds: 20, walkSpeedMps: 0, accuracyBand: [16, 20] },
  { seconds: 40, walkSpeedMps: 1.2, accuracyBand: [26, 34] },
  { seconds: 80, walkSpeedMps: 1.2, accuracyBand: [15, 24] },
]

const CYCLE_SECONDS = DEGRADED_WALKER_PHASES.reduce((sum, p) => sum + p.seconds, 0)
const METERS_PER_CYCLE = DEGRADED_WALKER_PHASES.reduce(
  (sum, p) => sum + p.seconds * p.walkSpeedMps,
  0,
)

/**
 * Pure state lookup for the degraded-walker scenario at `elapsedMs` since
 * tracking started. Distance advances only in moving phases; accuracy sweeps
 * its phase band deterministically so consecutive fixes vary like a real
 * urban-canyon signal instead of sitting on one value.
 */
export function degradedWalkerSampleAt(elapsedMs: number): MockScenarioSample {
  const elapsedSec = Math.max(0, elapsedMs / 1000)
  const cycles = Math.floor(elapsedSec / CYCLE_SECONDS)
  let secIntoCycle = elapsedSec - cycles * CYCLE_SECONDS
  let movedMeters = cycles * METERS_PER_CYCLE

  for (const phase of DEGRADED_WALKER_PHASES) {
    if (secIntoCycle >= phase.seconds) {
      secIntoCycle -= phase.seconds
      movedMeters += phase.seconds * phase.walkSpeedMps
      continue
    }
    movedMeters += secIntoCycle * phase.walkSpeedMps
    const [accMin, accMax] = phase.accuracyBand
    const accuracyM = Math.round(
      accMin + ((accMax - accMin) * (1 + Math.sin(elapsedSec * 0.7))) / 2,
    )
    return { movedMeters, accuracyM, speedMps: null }
  }

  // Unreachable: secIntoCycle < CYCLE_SECONDS always lands in a phase.
  return { movedMeters, accuracyM: 20, speedMps: null }
}

/** Parse the scenario env value; anything unrecognized means "no scenario". */
export function parseMockScenario(raw: string | undefined | null): MockScenarioKind | null {
  return raw?.trim().toLowerCase() === 'degraded_walker' ? 'degraded_walker' : null
}
