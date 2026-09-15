import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import { saveRunToHealth } from './healthWriteBackService'
import type {
  HealthWriteBackRecord,
  HealthWriteBackStore,
  HealthWriteBackWriter,
  SaveRunToHealthInput,
} from './healthWriteBackTypes'

const path: GpsPoint[] = [
  {
    lat: 13.7563,
    lng: 100.5018,
    accuracy: 8,
    timestamp: Date.parse('2026-05-31T08:00:00.000Z'),
    isPaused: false,
  },
  {
    lat: 13.757,
    lng: 100.502,
    accuracy: 8,
    timestamp: Date.parse('2026-05-31T08:00:05.000Z'),
    isPaused: false,
  },
]

const input: SaveRunToHealthInput = {
  activitySessionId: 'activity-123',
  source: 'gps_live',
  activityType: 'running',
  startedAt: new Date('2026-05-31T08:00:00.000Z'),
  endedAt: new Date('2026-05-31T08:30:00.000Z'),
  durationSeconds: 1800,
  distanceMeters: 5000,
  path,
  title: 'Morning run',
  serverConfirmed: true,
}

describe('saveRunToHealth', () => {
  it('does not duplicate an already saved health record', async () => {
    const saved: HealthWriteBackRecord = {
      activitySessionId: input.activitySessionId,
      status: 'saved',
      platform: 'ios',
      recordId: 'health-record-1',
      errorMessage: null,
      updatedAt: '2026-05-31T09:00:00.000Z',
    }
    const store = fakeStore(saved)
    let writerCalls = 0

    const result = await saveRunToHealth(input, {
      platform: 'ios',
      store,
      requestPermission: async () => 'granted',
      writer: {
        async save() {
          writerCalls += 1
          return { recordId: 'new-record' }
        },
      },
    })

    expect(result).toBe(saved)
    expect(writerCalls).toBe(0)
  })

  it('skips without calling the writer when write permission is denied', async () => {
    const store = fakeStore()
    let writerCalls = 0

    const result = await saveRunToHealth(input, {
      platform: 'android',
      store,
      requestPermission: async () => 'denied',
      writer: {
        async save() {
          writerCalls += 1
          return { recordId: 'health-record-1' }
        },
      },
      now: () => new Date('2026-05-31T09:00:00.000Z'),
    })

    expect(result).toMatchObject({
      status: 'skipped',
      platform: 'android',
      recordId: null,
      errorMessage: 'Health write permission was not granted.',
    })
    expect(writerCalls).toBe(0)
    expect(await store.getStatus(input.activitySessionId)).toEqual(result)
  })

  it('returns failed instead of throwing when the native writer fails', async () => {
    const store = fakeStore()

    const result = await saveRunToHealth(input, {
      platform: 'ios',
      store,
      requestPermission: async () => 'granted',
      writer: failingWriter('native write failed'),
    })

    expect(result).toMatchObject({
      status: 'failed',
      recordId: null,
      errorMessage: 'native write failed',
    })
  })

  it('skips invalid inputs before requesting permissions', async () => {
    const store = fakeStore()
    let permissionCalls = 0

    const result = await saveRunToHealth({ ...input, path: [path[0]] }, {
      platform: 'ios',
      store,
      requestPermission: async () => {
        permissionCalls += 1
        return 'granted'
      },
      writer: {
        async save() {
          return { recordId: 'health-record-1' }
        },
      },
    })

    expect(result.status).toBe('skipped')
    expect(permissionCalls).toBe(0)
  })
})

function fakeStore(initial?: HealthWriteBackRecord): HealthWriteBackStore {
  const records = new Map<string, HealthWriteBackRecord>()
  if (initial) records.set(initial.activitySessionId, initial)
  return {
    async getStatus(activitySessionId) {
      return records.get(activitySessionId) ?? null
    },
    async setStatus(record) {
      records.set(record.activitySessionId, record)
    },
  }
}

function failingWriter(message: string): HealthWriteBackWriter {
  return {
    async save() {
      throw new Error(message)
    },
  }
}
