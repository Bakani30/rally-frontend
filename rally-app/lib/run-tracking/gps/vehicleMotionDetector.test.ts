import { describe, expect, it } from 'vitest'
import {
  ACCURACY_LIMIT_M,
  VEHICLE_ENTER_SPEED_M_S,
  VEHICLE_ENTER_WINDOW_MS,
  VEHICLE_EXIT_SPEED_M_S,
  VEHICLE_EXIT_WINDOW_MS,
  createVehicleState,
  resetVehicleState,
  vehicleUpdate,
  type VehicleSample,
} from './vehicleMotionDetector'

const sample = (overrides: Partial<VehicleSample> = {}): VehicleSample => ({
  speed: 0,
  timestamp: 0,
  accuracy: 5,
  ...overrides,
})

const FAST = VEHICLE_ENTER_SPEED_M_S + 2 // clearly vehicle-class
const SLOW = VEHICLE_EXIT_SPEED_M_S - 2 // clearly human-class

describe('vehicleMotionDetector — enter', () => {
  it('does not latch until the enter window is (almost) full', () => {
    const state = createVehicleState()
    let result = { vehicle: false }
    for (let t = 0; t < VEHICLE_ENTER_WINDOW_MS - 2_000; t += 1_000) {
      result = vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
    }
    expect(result.vehicle).toBe(false)
  })

  it('latches once speed stays vehicle-class for the whole window', () => {
    const state = createVehicleState()
    const transitions: string[] = []
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      const result = vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
      if (result.transition) transitions.push(result.transition)
    }
    expect(state.vehicle).toBe(true)
    expect(transitions).toEqual(['enter'])
  })

  it('does not latch on a single fast spike (GPS jitter / sprint burst)', () => {
    const state = createVehicleState()
    let last
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      // Running pace throughout, with one isolated fast spike.
      const speed = t === 3_000 ? FAST + 10 : SLOW
      last = vehicleUpdate(state, sample({ timestamp: t, speed }))
    }
    expect(last?.vehicle).toBe(false)
  })

  it('does not latch while a slow sample remains in the window (ramp-up)', () => {
    const state = createVehicleState()
    let last
    // One slow sample at t=0, then vehicle-class — min over the window is slow
    // until t=0 ages out, so it must not latch before then.
    last = vehicleUpdate(state, sample({ timestamp: 0, speed: SLOW }))
    for (let t = 1_000; t < VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      last = vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
    }
    expect(last?.vehicle).toBe(false)
  })
})

describe('vehicleMotionDetector — exit', () => {
  function enterFirst(state = createVehicleState()) {
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
    }
    return state
  }

  it('latches in via enterFirst helper', () => {
    expect(enterFirst().vehicle).toBe(true)
  })

  it('unlatches once speed stays human-class for the exit window', () => {
    const state = enterFirst()
    let last
    for (let i = 1; i <= VEHICLE_EXIT_WINDOW_MS / 1_000 + 1; i++) {
      const t = VEHICLE_ENTER_WINDOW_MS + i * 1_000
      last = vehicleUpdate(state, sample({ timestamp: t, speed: SLOW }))
    }
    expect(last?.vehicle).toBe(false)
    expect(last?.transition).toBe('exit')
  })

  it('does NOT unlatch on a single slow blip (traffic stop in a car)', () => {
    const state = enterFirst()
    // A couple of slow samples then a fast one again — max over the window
    // stays vehicle-class, so it must hold the latch.
    vehicleUpdate(state, sample({ timestamp: VEHICLE_ENTER_WINDOW_MS + 1_000, speed: SLOW }))
    vehicleUpdate(state, sample({ timestamp: VEHICLE_ENTER_WINDOW_MS + 2_000, speed: SLOW }))
    const back = vehicleUpdate(
      state,
      sample({ timestamp: VEHICLE_ENTER_WINDOW_MS + 3_000, speed: FAST }),
    )
    expect(back.vehicle).toBe(true)
  })
})

describe('vehicleMotionDetector — accuracy gate', () => {
  it('does not latch on poor-accuracy fast samples', () => {
    const state = createVehicleState()
    let last
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      last = vehicleUpdate(
        state,
        sample({ timestamp: t, speed: FAST, accuracy: ACCURACY_LIMIT_M + 1 }),
      )
    }
    expect(last?.vehicle).toBe(false)
  })

  it('holds the latch when a poor-accuracy slow sample arrives mid-vehicle', () => {
    const state = createVehicleState()
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
    }
    expect(state.vehicle).toBe(true)
    const result = vehicleUpdate(
      state,
      sample({
        timestamp: VEHICLE_ENTER_WINDOW_MS + 500,
        speed: SLOW,
        accuracy: ACCURACY_LIMIT_M + 5,
      }),
    )
    expect(result.vehicle).toBe(true)
    expect(result.transition).toBeNull()
  })
})

describe('vehicleMotionDetector — buffer hygiene', () => {
  it('drops samples older than the longest window', () => {
    const state = createVehicleState()
    vehicleUpdate(state, sample({ timestamp: 0, speed: FAST }))
    vehicleUpdate(state, sample({ timestamp: 30_000, speed: FAST }))
    expect(state.samples.length).toBe(1)
    expect(state.samples[0].timestamp).toBe(30_000)
  })

  it('reset clears samples and the vehicle flag', () => {
    const state = createVehicleState()
    for (let t = 0; t <= VEHICLE_ENTER_WINDOW_MS; t += 1_000) {
      vehicleUpdate(state, sample({ timestamp: t, speed: FAST }))
    }
    expect(state.vehicle).toBe(true)
    resetVehicleState(state)
    expect(state.vehicle).toBe(false)
    expect(state.samples.length).toBe(0)
  })
})

describe('vehicleMotionDetector — invariants', () => {
  it('hysteresis: exit speed is below enter speed', () => {
    expect(VEHICLE_EXIT_SPEED_M_S).toBeLessThan(VEHICLE_ENTER_SPEED_M_S)
  })
  it('exit window is not longer than the enter window', () => {
    expect(VEHICLE_EXIT_WINDOW_MS).toBeLessThanOrEqual(VEHICLE_ENTER_WINDOW_MS)
  })
})
