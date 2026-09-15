import { describe, expect, it } from 'vitest'
import {
  buildHealthConnectClientRecordId,
  buildHealthWriteBackMetadata,
  sanitizeHealthWriteBackMetadata,
} from './healthWriteBackMetadata'

describe('health write-back metadata', () => {
  it('keeps only minimal Rally identity metadata', () => {
    expect(buildHealthWriteBackMetadata({
      activitySessionId: 'activity-123',
      source: 'gps_live',
    })).toEqual({
      RallyApp: 'rally-app',
      RallySchemaVersion: '1',
      RallySource: 'gps_live',
      RallyActivitySessionId: 'activity-123',
    })
  })

  it('drops game state and non-string metadata before writing to health stores', () => {
    expect(sanitizeHealthWriteBackMetadata({
      RallyApp: 'rally-app',
      RallyActivitySessionId: 'activity-123',
      reward: '100',
      stake: '50',
      opponent: 'user-2',
      guild: 'guild-1',
      challengeId: 'challenge-1',
      RallySchemaVersion: 1,
    })).toEqual({
      RallyApp: 'rally-app',
      RallyActivitySessionId: 'activity-123',
    })
  })

  it('builds stable Health Connect client record ids for dedupe', () => {
    expect(buildHealthConnectClientRecordId('activity 123/?', 'session')).toBe(
      'rally:activity123:session',
    )
  })
})
