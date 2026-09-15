import { describe, expect, it } from 'vitest'
import { createRetryQueueController } from './retryQueueController'
import type { RetryRunResult } from './retryQueue'

const result = (uploaded = 1): RetryRunResult => ({
  attempted: 1,
  uploaded,
  deadLettered: 0,
  remainingPending: 1 - uploaded,
})

describe('createRetryQueueController', () => {
  it('runs the queue and stores the last result', async () => {
    const seen: string[] = []
    const controller = createRetryQueueController({
      run: async (trigger) => {
        seen.push(trigger)
        return result()
      },
    })

    await expect(controller.runOnce('manual')).resolves.toEqual(result())
    expect(seen).toEqual(['manual'])
    expect(controller.getState().lastResult).toEqual(result())
    expect(controller.getState().isRunning).toBe(false)
  })

  it('skips overlapping runs', async () => {
    let release: () => void = () => {}
    const blocker = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const controller = createRetryQueueController({
      run: async () => {
        calls++
        await blocker
        return result()
      },
    })

    const first = controller.runOnce('app_active')
    await Promise.resolve()
    await expect(controller.runOnce('timer')).resolves.toBeNull()
    expect(calls).toBe(1)

    release()
    await first
    expect(controller.getState().isRunning).toBe(false)
  })

  it('captures errors without throwing to lifecycle callers', async () => {
    const error = new Error('network down')
    const seen: unknown[] = []
    const controller = createRetryQueueController({
      run: async () => {
        throw error
      },
      onError: (e) => seen.push(e),
    })

    await expect(controller.runOnce('timer')).resolves.toBeNull()
    expect(controller.getState().lastError).toBe(error)
    expect(seen).toEqual([error])
  })
})
