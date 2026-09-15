import { describe, expect, it } from 'vitest'
import {
  ACCURACY_LIMIT_M,
  DRIFT_PAUSE_RADIUS_M,
  DRIFT_PAUSE_WINDOW_MS,
  FAST_RESUME_SPEED_M_S,
  PAUSE_BLOCK_MEDIAN_SPEED_M_S,
  RESUME_ACCURACY_LIMIT_M,
  PAUSE_RADIUS_M,
  PAUSE_WINDOW_MS,
  RESUME_RADIUS_M,
  RESUME_WINDOW_MS,
  STATIONARY_MEDIAN_SPEED_M_S,
  autoPauseUpdate,
  createAutoPauseState,
  resetAutoPauseState,
  type AutoPauseSample,
} from './autoPauseDetector'

const BASE_LAT = 13.7563
const BASE_LNG = 100.5018

const sample = (overrides: Partial<AutoPauseSample> = {}): AutoPauseSample => ({
  lat: BASE_LAT,
  lng: BASE_LNG,
  timestamp: 0,
  speed: 0,
  accuracy: 5,
  ...overrides,
})

/** Move N meters along latitude. 1° lat ≈ 111_320 m. */
const offsetLat = (m: number) => m / 111_320

describe('autoPauseDetector — initial pause', () => {
  it('does not pause until the window is (almost) full', () => {
    const state = createAutoPauseState()
    let result = { paused: false }
    for (let t = 0; t < PAUSE_WINDOW_MS - 2_000; t += 1_000) {
      result = autoPauseUpdate(state, sample({ timestamp: t, speed: 0 }))
    }
    expect(result.paused).toBe(false)
  })

  it('pauses once the runner has stayed within PAUSE_RADIUS_M for the window', () => {
    const state = createAutoPauseState()
    const transitions: Array<{ t: number; transition: string | null }> = []
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      // ±0.5 m jitter — well inside PAUSE_RADIUS_M.
      const jitter = offsetLat((t % 2 === 0 ? 0.4 : -0.4))
      const result = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + jitter, speed: 0.1 }),
      )
      if (result.transition) transitions.push({ t, transition: result.transition })
    }
    expect(state.paused).toBe(true)
    expect(transitions).toHaveLength(1)
    expect(transitions[0].transition).toBe('pause')
  })

  it('does not pause when the runner is genuinely moving', () => {
    const state = createAutoPauseState()
    let last
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      // 3 m forward each second = 3 m/s pace, will exceed PAUSE_RADIUS_M.
      last = autoPauseUpdate(
        state,
        sample({
          timestamp: t,
          lat: BASE_LAT + offsetLat((t / 1000) * 3),
          speed: 3,
        }),
      )
    }
    expect(last?.paused).toBe(false)
  })

  it('does not pause on a brief tight-corner slowdown', () => {
    const state = createAutoPauseState()
    // Move 30m in 3s, freeze for 4s, move 30m in 3s — total 10s, fixed = 4s.
    let last
    let t = 0
    for (let i = 0; i < 3; i++, t += 1_000) {
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(i * 10), speed: 3 }),
      )
    }
    const frozenAt = offsetLat(20)
    for (let i = 0; i < 4; i++, t += 1_000) {
      last = autoPauseUpdate(state, sample({ timestamp: t, lat: BASE_LAT + frozenAt, speed: 0 }))
    }
    for (let i = 0; i < 3; i++, t += 1_000) {
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(20 + i * 10), speed: 3 }),
      )
    }
    expect(last?.paused).toBe(false)
  })
})

describe('autoPauseDetector — resume', () => {
  function pauseFirst(state = createAutoPauseState()) {
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      autoPauseUpdate(state, sample({ timestamp: t, speed: 0 }))
    }
    return state
  }

  it('resumes when the runner moves > RESUME_RADIUS_M across the resume window', () => {
    const state = pauseFirst()
    expect(state.paused).toBe(true)

    // Move 5m per second for 4 seconds = 20m total → triggers resume.
    let last
    for (let i = 1; i <= 4; i++) {
      const t = PAUSE_WINDOW_MS + i * 1_000
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(i * 5), speed: 5 }),
      )
    }
    expect(last?.paused).toBe(false)
  })

  it('does NOT resume on a single fast-spike sample (jitter while standing)', () => {
    const state = pauseFirst()
    // One outlier sample 5m away, then back to original spot — total spread
    // remains under RESUME_RADIUS_M.
    autoPauseUpdate(
      state,
      sample({ timestamp: PAUSE_WINDOW_MS + 1_000, lat: BASE_LAT + offsetLat(5), speed: 0.6 }),
    )
    const back = autoPauseUpdate(state, sample({ timestamp: PAUSE_WINDOW_MS + 2_000, speed: 0 }))
    expect(back.paused).toBe(true)
  })

  it('fast-resumes when OS speed clearly indicates running', () => {
    const state = pauseFirst()
    const result = autoPauseUpdate(
      state,
      sample({ timestamp: PAUSE_WINDOW_MS + 500, speed: FAST_RESUME_SPEED_M_S + 0.1 }),
    )
    expect(result.paused).toBe(false)
    expect(result.transition).toBe('resume')
  })

  it('fast-resumes a normal walking pace (~1.3 m/s), not just running', () => {
    // Regression: a walker cruising at ~1.3 m/s used to clear neither the
    // fast-resume speed gate (was 2.0 m/s) nor the 12m/4s position path, so
    // auto-pause stayed latched through their whole walk and under-counted it.
    const state = pauseFirst()
    const result = autoPauseUpdate(
      state,
      sample({ timestamp: PAUSE_WINDOW_MS + 500, speed: 1.3, accuracy: 5 }),
    )
    expect(result.paused).toBe(false)
    expect(result.transition).toBe('resume')
  })

  it('resumes a walker via position over WALK_RESUME_WINDOW_MS when OS speed is unavailable', () => {
    // Regression (2026-07-10 field incident): power-save distance-filtered
    // fixes arrive sparse with speed=null, so fast-resume never fires and the
    // 12m/4s window demands running pace — a walker stayed latched paused for
    // 60-70s stretches. 12m spread across the 12s walk window must resume.
    const state = pauseFirst()
    expect(state.paused).toBe(true)

    // ~1.2 m/s walk sampled every 4s (distance filter ~5-6m), speed unknown.
    let last
    for (let i = 1; i <= 3; i++) {
      const t = PAUSE_WINDOW_MS + i * 4_000
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(i * 4.8), speed: null }),
      )
    }
    expect(last?.paused).toBe(false)
    expect(last?.transition).toBe('resume')
  })

  it('stays paused on stationary jitter across the walk window (hysteresis intact)', () => {
    const state = pauseFirst()
    // 20s of standing still with ±3m jitter — spread stays under
    // RESUME_RADIUS_M, so neither resume window may fire.
    let last
    for (let i = 1; i <= 20; i++) {
      const jitter = offsetLat(i % 2 === 0 ? 3 : -3)
      last = autoPauseUpdate(
        state,
        sample({ timestamp: PAUSE_WINDOW_MS + i * 1_000, lat: BASE_LAT + jitter, speed: 0.2 }),
      )
    }
    expect(last?.paused).toBe(true)
  })
})

describe('autoPauseDetector — accuracy gate', () => {
  it('does not flip pause state when accuracy is poor', () => {
    const state = createAutoPauseState()
    // Fill window with poor-accuracy stationary samples.
    let last
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, accuracy: ACCURACY_LIMIT_M + 1 }),
      )
    }
    // Even though stationary, poor accuracy should not flip to paused.
    expect(last?.paused).toBe(false)
  })

  it('does not flip resume state when garbage-accuracy sample arrives mid-pause', () => {
    const state = createAutoPauseState()
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      autoPauseUpdate(state, sample({ timestamp: t }))
    }
    expect(state.paused).toBe(true)
    // Spike sample past even the relaxed resume ceiling — hold latched state.
    const result = autoPauseUpdate(
      state,
      sample({
        timestamp: PAUSE_WINDOW_MS + 500,
        lat: BASE_LAT + offsetLat(50),
        accuracy: RESUME_ACCURACY_LIMIT_M + 5,
        speed: 5,
      }),
    )
    expect(result.paused).toBe(true)
    expect(result.transition).toBeNull()
  })

  it('resumes via position through a coarse-accuracy (26–35m) urban-canyon stretch', () => {
    // Regression (2026-07-10): the strict quality gate blocked ALL resume
    // evaluation above 25m, so a latched walker in a building-shadow stretch
    // (26–35m accuracy) could never resume and their distance was excluded.
    const state = createAutoPauseState()
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      autoPauseUpdate(state, sample({ timestamp: t }))
    }
    expect(state.paused).toBe(true)

    // Walk again at ~1.2 m/s with coarse 30m accuracy, speed unavailable.
    let last
    for (let i = 1; i <= 14; i++) {
      last = autoPauseUpdate(
        state,
        sample({
          timestamp: PAUSE_WINDOW_MS + i * 1_000,
          lat: BASE_LAT + offsetLat(i * 1.2),
          accuracy: 30,
          speed: null,
        }),
      )
    }
    expect(last?.paused).toBe(false)
  })

  it('does not latch a pause on coarse-accuracy samples (pause keeps strict limit)', () => {
    const state = createAutoPauseState()
    // Stationary for a full window, but every sample is 26-35m — pause flips
    // still require the strict ACCURACY_LIMIT_M, so no latch.
    let last
    for (let t = 0; t <= PAUSE_WINDOW_MS + 4_000; t += 1_000) {
      last = autoPauseUpdate(state, sample({ timestamp: t, accuracy: 30 }))
    }
    expect(last?.paused).toBe(false)
  })
})

describe('autoPauseDetector — U-turn + stationary drift (2026-07-11 field incident)', () => {
  it('does not latch pause on a walking U-turn (fixes cluster, Doppler says moving)', () => {
    // Out-and-back at walking pace: positions around the turn point all sit
    // inside PAUSE_RADIUS_M, which used to latch a false pause on every turn.
    const state = createAutoPauseState()
    const transitions: string[] = []
    let t = 0
    let pos = 0
    const step = (speed: number, deltaM: number) => {
      pos += deltaM
      const result = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(pos), speed }),
      )
      if (result.transition) transitions.push(result.transition)
      t += 1_000
    }
    for (let i = 0; i < 12; i++) step(1.2, 1.2) // walk out
    for (let i = 0; i < 5; i++) step(0.9, 0.9) // slow into the turn
    for (let i = 0; i < 15; i++) step(1.2, -1.2) // walk back over the same line
    expect(transitions).toEqual([])
    expect(state.paused).toBe(false)
  })

  it('latches a drift-pause while sitting still with a wandering fix', () => {
    // Multipath random-walks a stationary phone's fix past PAUSE_RADIUS_M, so
    // the strict 8m/12s latch never fires — but Doppler stays ~0.1-0.3 m/s.
    const state = createAutoPauseState()
    const transitions: string[] = []
    for (let t = 0; t <= DRIFT_PAUSE_WINDOW_MS + 2_000; t += 1_000) {
      const wander = offsetLat(9 * Math.sin(t / 3_000)) // ±9m wander, fast enough to defeat the 8m/12s latch
      const result = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + wander, speed: 0.2 }),
      )
      if (result.transition) transitions.push(result.transition)
    }
    expect(state.paused).toBe(true)
    expect(transitions).toEqual(['pause'])
  })

  it('does not drift-latch a walker whose Doppler reads ~0 (real displacement)', () => {
    const state = createAutoPauseState()
    let last
    for (let t = 0; t <= DRIFT_PAUSE_WINDOW_MS + 5_000; t += 1_000) {
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat((t / 1000) * 1.3), speed: 0.1 }),
      )
    }
    expect(last?.paused).toBe(false)
  })

  it('holds a drift-pause against continued fix wander (no flapping)', () => {
    const state = driftPauseFirst()
    // Keep wandering ±6m with stationary Doppler — the 12m spread would clear
    // the plain resume window, but the drift-aware guard must hold the latch.
    let last
    for (let i = 1; i <= 20; i++) {
      const t = DRIFT_PAUSE_WINDOW_MS + 2_000 + i * 1_000
      const wander = offsetLat(9 * Math.sin(t / 3_000))
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + wander, speed: 0.2 }),
      )
    }
    expect(last?.paused).toBe(true)
  })

  it('resumes from a drift-pause once displacement sustains past the drift radius', () => {
    const state = driftPauseFirst()
    // Walk away with broken Doppler (speed ~0.1): guard demands the full
    // drift radius from the latch point, ~16s at 1.3 m/s.
    let last
    let resumedAt: number | null = null
    for (let i = 1; i <= 25; i++) {
      const t = DRIFT_PAUSE_WINDOW_MS + 2_000 + i * 1_000
      last = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + offsetLat(i * 1.3), speed: 0.1 }),
      )
      if (last.transition === 'resume' && resumedAt == null) resumedAt = i
    }
    expect(last?.paused).toBe(false)
    expect(resumedAt).not.toBeNull()
    expect(resumedAt!).toBeLessThanOrEqual(Math.ceil(DRIFT_PAUSE_RADIUS_M / 1.3) + 2)
  })

  function driftPauseFirst() {
    const state = createAutoPauseState()
    for (let t = 0; t <= DRIFT_PAUSE_WINDOW_MS + 2_000; t += 1_000) {
      const wander = offsetLat(9 * Math.sin(t / 3_000))
      autoPauseUpdate(state, sample({ timestamp: t, lat: BASE_LAT + wander, speed: 0.2 }))
    }
    expect(state.paused).toBe(true)
    return state
  }
})

describe('autoPauseDetector — sparse stationary delivery (2026-07-12 field incident)', () => {
  it('latches through iOS stationary fix-thinning when Doppler confirms standstill', () => {
    // A stationary iPhone thins fixes to every ~8-11s. The delivery-gap guard
    // used to reject every such window, delaying the stop-latch by 30-40s.
    // Doppler reading ~0.1 m/s vouches for the gaps.
    const state = createAutoPauseState()
    const transitions: string[] = []
    let latchedAtMs: number | null = null
    for (const t of [0, 11_000, 22_000, 30_000, 38_000]) {
      const jitter = offsetLat(t % 22_000 === 0 ? 1.5 : -1.5)
      const result = autoPauseUpdate(
        state,
        sample({ timestamp: t, lat: BASE_LAT + jitter, speed: 0.1, accuracy: 14 }),
      )
      if (result.transition) transitions.push(result.transition)
      if (result.transition === 'pause' && latchedAtMs === null) latchedAtMs = t
    }
    expect(transitions).toEqual(['pause'])
    // Three fixes are needed before the Doppler median can vouch for the
    // gaps, so ~2 thinning intervals after the stop is the physical floor.
    expect(latchedAtMs!).toBeLessThanOrEqual(PAUSE_WINDOW_MS + 11_000)
  })

  it('still refuses to latch across a delivery gap without Doppler evidence', () => {
    // The moving case the gap guard exists for: fixes starve at speed, the
    // Kalman-lagged first fix after the hole clusters near the pre-gap fixes,
    // and speed is null (power-save backfill) — no latch.
    const state = createAutoPauseState()
    let last
    autoPauseUpdate(state, sample({ timestamp: 0, speed: null }))
    autoPauseUpdate(state, sample({ timestamp: 2_000, speed: null }))
    for (let t = 12_000; t <= 20_000; t += 1_000) {
      last = autoPauseUpdate(state, sample({ timestamp: t, speed: null }))
    }
    expect(last?.paused).toBe(false)
  })
})

describe('autoPauseDetector — buffer hygiene', () => {
  it('drops old samples outside the longest window', () => {
    const state = createAutoPauseState()
    autoPauseUpdate(state, sample({ timestamp: 0 }))
    autoPauseUpdate(state, sample({ timestamp: DRIFT_PAUSE_WINDOW_MS + 10_000 }))
    expect(state.samples.length).toBe(1)
    expect(state.samples[0].timestamp).toBe(DRIFT_PAUSE_WINDOW_MS + 10_000)
  })

  it('reset clears samples and pause flag', () => {
    const state = createAutoPauseState()
    for (let t = 0; t <= PAUSE_WINDOW_MS; t += 1_000) {
      autoPauseUpdate(state, sample({ timestamp: t }))
    }
    expect(state.paused).toBe(true)
    expect(state.samples.length).toBeGreaterThan(0)
    resetAutoPauseState(state)
    expect(state.paused).toBe(false)
    expect(state.samples.length).toBe(0)
  })
})

describe('autoPauseDetector — invariants', () => {
  it('hysteresis: pause radius < resume radius', () => {
    expect(PAUSE_RADIUS_M).toBeLessThan(RESUME_RADIUS_M)
  })
  it('resume window shorter than pause window (responsiveness)', () => {
    expect(RESUME_WINDOW_MS).toBeLessThan(PAUSE_WINDOW_MS)
  })
  it('stationary Doppler ceiling < walking floor (median speed bands do not overlap)', () => {
    expect(STATIONARY_MEDIAN_SPEED_M_S).toBeLessThan(PAUSE_BLOCK_MEDIAN_SPEED_M_S)
  })
  it('drift radius > resume radius so drift wander cannot flap the latch', () => {
    expect(DRIFT_PAUSE_RADIUS_M).toBeGreaterThan(RESUME_RADIUS_M)
  })
})
