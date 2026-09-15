import { describe, expect, it } from 'vitest'

import {
  EMPTY_REFEREE_RUNNING_DRAFT,
  deriveRefereeRunningDraftResult,
  refereeRunningDraftReducer,
} from './refereeRunningDraft'

describe('referee running draft reducer', () => {
  it('records and replaces marks by side/type/checkpoint slot', () => {
    const first = refereeRunningDraftReducer(EMPTY_REFEREE_RUNNING_DRAFT, {
      type: 'record_mark',
      mark: {
        type: 'checkpoint',
        sideIndex: 0,
        participantUserId: 'runner-a',
        checkpointIndex: 1,
        elapsedMs: 300000,
        note: null,
      },
    })
    const second = refereeRunningDraftReducer(first, {
      type: 'record_mark',
      mark: {
        type: 'checkpoint',
        sideIndex: 0,
        participantUserId: 'runner-a',
        checkpointIndex: 1,
        elapsedMs: 305000,
        note: 'corrected',
      },
    })

    expect(second.marks).toHaveLength(1)
    expect(second.marks[0]).toMatchObject({ elapsedMs: 305000, note: 'corrected' })
    expect(second.nextCheckpointIndex).toBe(2)
  })

  it('derives winner from finish elapsed time only after both runners finish', () => {
    const side0 = refereeRunningDraftReducer(EMPTY_REFEREE_RUNNING_DRAFT, {
      type: 'record_mark',
      mark: {
        type: 'finish',
        sideIndex: 0,
        participantUserId: 'runner-a',
        checkpointIndex: null,
        elapsedMs: 1200000,
        note: null,
      },
    })

    expect(deriveRefereeRunningDraftResult(side0)).toBeNull()

    const both = refereeRunningDraftReducer(side0, {
      type: 'record_mark',
      mark: {
        type: 'finish',
        sideIndex: 1,
        participantUserId: 'runner-b',
        checkpointIndex: null,
        elapsedMs: 1210000,
        note: null,
      },
    })

    expect(deriveRefereeRunningDraftResult(both)).toMatchObject({
      winnerSide: 0,
      isTie: false,
    })
  })
})
