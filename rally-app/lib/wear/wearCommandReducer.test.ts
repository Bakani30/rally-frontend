import { describe, expect, it } from 'vitest'
import { decideWearRunCommand } from './wearCommandReducer'
import type { WearCommand, WearRunState } from './wearProtocol'

const baseState: WearRunState = {
  sessionId: null,
  status: 'idle',
  distanceMeters: 0,
  durationSeconds: 0,
  paceSecondsPerKm: null,
  heartRate: null,
  matchLabel: null,
  guildGoalLabel: null,
  guildGoalProgress: null,
  activeMatchId: null,
  activeMatchLabel: null,
  joinCode: null,
  activeGuildGoalId: null,
  activeGuildGoalLabel: null,
  healthSummary: null,
  scoreDraft: null,
  partnerCampaign: null,
}

function command(type: WearCommand['type'], payload: WearCommand['payload'] = {}): WearCommand {
  return {
    version: 2,
    commandId: `cmd-${type}`,
    sessionId: null,
    type,
    sentAt: 1,
    payload,
  }
}

describe('decideWearRunCommand', () => {
  it('maps valid lifecycle commands to run actions', () => {
    expect(decideWearRunCommand(command('START_RUN'), baseState).action).toBe('start')
    expect(decideWearRunCommand(command('PAUSE_RUN'), { ...baseState, status: 'active' }).action).toBe('pause')
    expect(decideWearRunCommand(command('RESUME_RUN'), { ...baseState, status: 'paused' }).action).toBe('resume')
    expect(decideWearRunCommand(command('STOP_RUN'), { ...baseState, status: 'active' }).action).toBe('stop')
  })

  it('ignores lifecycle commands that do not match phone state', () => {
    expect(decideWearRunCommand(command('PAUSE_RUN'), baseState).action).toBe('ignore')
    expect(decideWearRunCommand(command('RESUME_RUN'), baseState).action).toBe('ignore')
    expect(decideWearRunCommand(command('STOP_RUN'), baseState).action).toBe('ignore')
  })

  it('always allows state refresh', () => {
    expect(decideWearRunCommand(command('REQUEST_STATE'), baseState).action).toBe('publish_state')
  })

  it('allows room hints only when the host join code is on phone state', () => {
    expect(decideWearRunCommand(command('JOIN_ROOM_HINT'), baseState).action).toBe('reject')
    expect(decideWearRunCommand(command('JOIN_ROOM_HINT'), { ...baseState, joinCode: 'RALLY123' }).action)
      .toBe('publish_state')
  })

  it('accepts score events only for an active team score draft', () => {
    expect(decideWearRunCommand(command('SCORE_EVENT', { scoreDelta: 2 }), baseState).action).toBe('reject')
    expect(decideWearRunCommand(
      command('SCORE_EVENT', { scoreDelta: 2 }),
      {
        ...baseState,
        activeMatchId: 'match-1',
        scoreDraft: { matchId: 'match-1', sideIndex: 0, teamScore: 8, eventCount: 4, lastDelta: 3 },
      },
    )).toEqual({ action: 'score_event', points: 2, message: null })
  })

  it('rejects empty health snapshots', () => {
    expect(decideWearRunCommand(command('PUBLISH_HEALTH_SNAPSHOT'), baseState).action).toBe('reject')
    expect(decideWearRunCommand(
      command('PUBLISH_HEALTH_SNAPSHOT', { healthSummary: { steps: 10, distanceMeters: null, calories: null, heartRate: null } }),
      baseState,
    ).action).toBe('health_snapshot')
  })
})
