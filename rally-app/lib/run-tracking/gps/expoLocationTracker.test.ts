import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ExpoLocationTracker } from './expoLocationTracker'

const h = vi.hoisted(() => {
  const pendingWatches: ((sub: { remove: () => void }) => void)[] = []
  const removeSpies: ReturnType<typeof vi.fn>[] = []
  return { pendingWatches, removeSpies }
})

vi.mock('expo-location', () => ({
  Accuracy: { Highest: 6, BestForNavigation: 5, High: 4, Balanced: 3 },
  ActivityType: { Fitness: 2 },
  watchPositionAsync: vi.fn(
    () =>
      new Promise((resolve) => {
        h.pendingWatches.push(resolve as (sub: { remove: () => void }) => void)
      }),
  ),
  startLocationUpdatesAsync: vi.fn(async () => {}),
}))

vi.mock('./backgroundLocationTask', () => ({
  BG_LOCATION_TASK: 'bg-task',
  ensureBackgroundLocationTaskRegistered: vi.fn(),
  stopBackgroundLocationUpdates: vi.fn(async () => {}),
}))

function resolveNextWatch(): ReturnType<typeof vi.fn> {
  const remove = vi.fn()
  h.removeSpies.push(remove)
  const resolve = h.pendingWatches.shift()
  if (!resolve) throw new Error('no pending watchPositionAsync call')
  resolve({ remove })
  return remove
}

beforeEach(() => {
  h.pendingWatches.length = 0
  h.removeSpies.length = 0
})

describe('ExpoLocationTracker warm-up lifecycle', () => {
  it('removes the subscription when cancelWarmUp lands while watchPositionAsync is still pending', async () => {
    const tracker = new ExpoLocationTracker()

    const warmUpPromise = tracker.warmUp(() => {})
    // Cancel fires before the OS resolves the watch — the post-run
    // reset() → unmount sequence on the run screen does exactly this.
    await tracker.cancelWarmUp()
    const remove = resolveNextWatch()
    await warmUpPromise

    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('keeps the subscription when warm-up completes uncancelled, then removes it on cancel', async () => {
    const tracker = new ExpoLocationTracker()

    const warmUpPromise = tracker.warmUp(() => {})
    const remove = resolveNextWatch()
    await warmUpPromise
    expect(remove).not.toHaveBeenCalled()

    await tracker.cancelWarmUp()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('does not double-subscribe when warmUp is called while already warmed', async () => {
    const tracker = new ExpoLocationTracker()

    const first = tracker.warmUp(() => {})
    resolveNextWatch()
    await first

    await tracker.warmUp(() => {})
    expect(h.pendingWatches.length).toBe(0)
  })
})
