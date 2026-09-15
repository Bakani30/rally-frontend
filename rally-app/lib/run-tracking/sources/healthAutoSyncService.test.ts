import { describe, expect, it, vi } from 'vitest'
import {
  getHealthAutoSyncState,
  runHealthAutoSyncBootstrap,
} from './healthAutoSyncService'
import type { HealthListItem } from './healthSourceListing'

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return {
    async getItem(key: string) {
      return data.get(key) ?? null
    },
    async setItem(key: string, value: string) {
      data.set(key, value)
    },
    dump() {
      return Object.fromEntries(data.entries())
    },
  }
}

function runItem(id: string, endedAt: string): HealthListItem {
  const end = new Date(endedAt)
  return {
    id,
    startedAt: new Date(end.getTime() - 30 * 60_000),
    endedAt: end,
    distanceMeters: 5000,
    durationSeconds: 1800,
    source: 'healthkit',
  }
}

describe('health auto sync bootstrap', () => {
  it('asks read permission once for a new user and scans from now', async () => {
    const storage = memoryStorage()
    const requestPermissions = vi.fn(async () => 'granted' as const)
    const listRuns = vi.fn(async () => [runItem('future-run', '2026-06-13T08:30:00.000Z')])

    const result = await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T08:00:00.000Z'),
    })

    expect(requestPermissions).toHaveBeenCalledTimes(1)
    expect(listRuns).toHaveBeenCalledWith({
      since: new Date('2026-06-13T08:00:00.000Z'),
      now: new Date('2026-06-13T08:00:00.000Z'),
      limit: 12,
    })
    expect(result.requestedPermission).toBe(true)
    expect(result.detectedRuns.map((item) => item.id)).toEqual(['future-run'])
    const state = await getHealthAutoSyncState('user-1', { storage })
    expect(state?.permissionStatus).toBe('granted')
    expect(state?.seenWorkoutKeys).toEqual(['healthkit:future-run'])
  })

  it('does not re-prompt a user who denied health access', async () => {
    const storage = memoryStorage()
    const requestPermissions = vi.fn(async () => 'denied' as const)
    const listRuns = vi.fn(async () => [])

    await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T08:00:00.000Z'),
    })
    const result = await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T09:00:00.000Z'),
    })

    expect(requestPermissions).toHaveBeenCalledTimes(1)
    expect(listRuns).not.toHaveBeenCalled()
    expect(result.requestedPermission).toBe(false)
    expect(result.detectedRuns).toEqual([])
  })

  it('rescans granted users with a small overlap instead of importing history', async () => {
    const storage = memoryStorage()
    const requestPermissions = vi.fn(async () => 'granted' as const)
    const listRuns = vi.fn(async () => [])

    await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T08:00:00.000Z'),
    })
    await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T12:00:00.000Z'),
    })

    expect(requestPermissions).toHaveBeenCalledTimes(1)
    expect(listRuns).toHaveBeenLastCalledWith({
      since: new Date('2026-06-13T06:00:00.000Z'),
      now: new Date('2026-06-13T12:00:00.000Z'),
      limit: 12,
    })
  })

  it('dedupes already detected workouts by source and external workout id', async () => {
    const storage = memoryStorage()
    const requestPermissions = vi.fn(async () => 'granted' as const)
    const listRuns = vi
      .fn()
      .mockResolvedValueOnce([runItem('run-1', '2026-06-13T08:30:00.000Z')])
      .mockResolvedValueOnce([
        runItem('run-1', '2026-06-13T08:30:00.000Z'),
        runItem('run-2', '2026-06-13T09:30:00.000Z'),
      ])

    await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T08:00:00.000Z'),
    })
    const result = await runHealthAutoSyncBootstrap('user-1', {
      storage,
      requestPermissions,
      listRuns,
      now: () => new Date('2026-06-13T10:00:00.000Z'),
    })

    expect(result.detectedRuns.map((item) => item.id)).toEqual(['run-2'])
    expect((await getHealthAutoSyncState('user-1', { storage }))?.seenWorkoutKeys).toEqual([
      'healthkit:run-1',
      'healthkit:run-2',
    ])
  })
})
