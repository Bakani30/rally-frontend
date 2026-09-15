import { describe, expect, it } from 'vitest'
import { parseWearCommand } from './wearProtocol'

describe('parseWearCommand', () => {
  it('accepts version 2 commands with JSON payload', () => {
    const parsed = parseWearCommand({
      version: 2,
      commandId: 'cmd-1',
      type: 'START_RUN',
      sessionId: 'run-1',
      sentAt: 123,
      payload: JSON.stringify({ heartRate: 151.2 }),
    })

    expect(parsed).toEqual({
      version: 2,
      commandId: 'cmd-1',
      type: 'START_RUN',
      sessionId: 'run-1',
      sentAt: 123,
      payload: { heartRate: 151 },
    })
  })

  it('rejects old protocol versions and unknown command types', () => {
    expect(parseWearCommand({ version: 1, commandId: 'x', type: 'START_RUN' })).toBeNull()
    expect(parseWearCommand({ version: 2, commandId: 'x', type: 'DANCE' })).toBeNull()
  })

  it('parses score events and health snapshots safely', () => {
    expect(parseWearCommand({
      version: 2,
      commandId: 'score-1',
      type: 'SCORE_EVENT',
      payload: { scoreDelta: 3 },
    })?.payload.scoreDelta).toBe(3)

    expect(parseWearCommand({
      version: 2,
      commandId: 'health-1',
      type: 'PUBLISH_HEALTH_SNAPSHOT',
      payload: JSON.stringify({ steps: 1200, distanceMeters: 940.4, calories: 62.7, heartRate: 141.2 }),
    })?.payload.healthSummary).toEqual({
      steps: 1200,
      distanceMeters: 940,
      calories: 63,
      heartRate: 141,
    })
  })
})
