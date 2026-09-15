import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runRetryQueue, MAX_RETRY_ATTEMPTS } from './retryQueue'
import {
  countPendingUpload,
  incrementSessionAttempt,
  listPendingUpload,
  markFailed,
  markUploaded,
} from './sessionBuffer'
import type { StoredSession } from './sessionBuffer'
import { RunSessionSubmitBlockedError } from '../session/runSessionSubmitRules'

vi.mock('./sessionBuffer', () => ({
  countPendingUpload: vi.fn(),
  listPendingUpload: vi.fn(),
  markUploaded: vi.fn(),
  markFailed: vi.fn(),
  incrementSessionAttempt: vi.fn(),
}))

const mockedCountPendingUpload = vi.mocked(countPendingUpload)
const mockedListPendingUpload = vi.mocked(listPendingUpload)
const mockedMarkUploaded = vi.mocked(markUploaded)
const mockedMarkFailed = vi.mocked(markFailed)
const mockedIncrementSessionAttempt = vi.mocked(incrementSessionAttempt)

function session(sessionId: string, attempts = 0): StoredSession {
  return {
    sessionId,
    matchId: null,
    challengeId: null,
    startedAt: new Date('2026-05-25T10:00:00.000Z'),
    endedAt: new Date('2026-05-25T10:30:00.000Z'),
    status: 'stopped',
    source: 'gps_live',
    pausedDurationSeconds: 0,
    integrityFlags: [],
    attempts,
    lastErrorCode: null,
  }
}

describe('runRetryQueue', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedMarkUploaded.mockResolvedValue(undefined)
    mockedMarkFailed.mockResolvedValue(undefined)
    mockedIncrementSessionAttempt.mockResolvedValue(undefined)
  })

  it('caps each retry pass so reconnect cannot upload the whole backlog at once', async () => {
    mockedCountPendingUpload.mockResolvedValue(5)
    mockedListPendingUpload.mockResolvedValue([
      session('sid-1'),
      session('sid-2'),
    ])

    const result = await runRetryQueue(async () => ({ kind: 'uploaded' }), {
      maxAttemptsPerRun: 2,
    })

    expect(mockedListPendingUpload).toHaveBeenCalledWith(2)
    expect(mockedMarkUploaded).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      attempted: 2,
      uploaded: 2,
      deadLettered: 0,
      remainingPending: 3,
    })
  })

  it('excludes the in-memory current session from the retry pass', async () => {
    // The user is sitting on the post-stop summary: the buffer counts the row
    // as pending, but the retry pass must not upload it out from under them.
    mockedCountPendingUpload.mockResolvedValue(1)
    mockedListPendingUpload.mockResolvedValue([])

    const result = await runRetryQueue(async () => ({ kind: 'uploaded' }), {
      maxAttemptsPerRun: 3,
      excludeSessionId: 'sid-current',
    })

    expect(mockedListPendingUpload).toHaveBeenCalledWith(3, 'sid-current')
    expect(mockedMarkUploaded).not.toHaveBeenCalled()
    expect(result).toEqual({ attempted: 0, uploaded: 0, deadLettered: 0, remainingPending: 1 })
  })

  it('uploads the session once it is no longer the current one', async () => {
    mockedCountPendingUpload.mockResolvedValue(1)
    mockedListPendingUpload.mockResolvedValue([session('sid-current')])

    const result = await runRetryQueue(async () => ({ kind: 'uploaded' }), {
      maxAttemptsPerRun: 3,
    })

    expect(mockedListPendingUpload).toHaveBeenCalledWith(3)
    expect(mockedMarkUploaded).toHaveBeenCalledWith('sid-current')
    expect(result).toEqual({ attempted: 1, uploaded: 1, deadLettered: 0, remainingPending: 0 })
  })

  it('bumps attempts and stops the pass after a transient failure to avoid hammering a busy server', async () => {
    mockedCountPendingUpload.mockResolvedValue(3)
    mockedListPendingUpload.mockResolvedValue([
      session('sid-1'),
      session('sid-2'),
      session('sid-3'),
    ])
    const submitted: string[] = []

    const result = await runRetryQueue(async (sessionId) => {
      submitted.push(sessionId)
      return sessionId === 'sid-1'
        ? { kind: 'transient_failure', error: new Error('rate_limited') }
        : { kind: 'uploaded' }
    }, { maxAttemptsPerRun: 3 })

    expect(submitted).toEqual(['sid-1'])
    expect(mockedIncrementSessionAttempt).toHaveBeenCalledWith('sid-1', 'rate_limited')
    expect(mockedMarkFailed).not.toHaveBeenCalled()
    expect(mockedMarkUploaded).not.toHaveBeenCalled()
    expect(result).toEqual({
      attempted: 1,
      uploaded: 0,
      deadLettered: 0,
      remainingPending: 3,
    })
  })

  it('dead-letters a permanent validation rejection immediately and keeps the pass moving', async () => {
    mockedCountPendingUpload.mockResolvedValue(3)
    mockedListPendingUpload.mockResolvedValue([
      session('sid-bad'),
      session('sid-2'),
      session('sid-3'),
    ])
    const deadLetterCodes: string[] = []

    const result = await runRetryQueue(
      async (sessionId) =>
        sessionId === 'sid-bad'
          ? { kind: 'permanent_failure', error: { code: 'path_too_sparse' } }
          : { kind: 'uploaded' },
      { maxAttemptsPerRun: 3, onDeadLetter: (code) => deadLetterCodes.push(code) },
    )

    expect(mockedMarkFailed).toHaveBeenCalledWith('sid-bad', 'path_too_sparse')
    expect(deadLetterCodes).toEqual(['path_too_sparse'])
    expect(mockedMarkUploaded).toHaveBeenCalledWith('sid-2')
    expect(mockedMarkUploaded).toHaveBeenCalledWith('sid-3')
    expect(result).toEqual({
      attempted: 3,
      uploaded: 2,
      deadLettered: 1,
      remainingPending: 0,
    })
  })

  it('dead-letters a fresh <100m run in ONE pass with its real code, not after 5 retries as max_retries', async () => {
    // Regression for the offline-outbox bug: a 0-3m run (e.g. GPS never moved)
    // is rejected by the client precheck as RunSessionSubmitBlockedError. It
    // must dead-letter immediately as `distance_too_short`, not burn 5 transient
    // retries and finally surface the internal `max_retries` sentinel to the UI.
    mockedCountPendingUpload.mockResolvedValue(1)
    mockedListPendingUpload.mockResolvedValue([session('sid-short', 0)])
    const deadLetterCodes: string[] = []

    const result = await runRetryQueue(
      async () => ({
        kind: 'transient_failure',
        error: new RunSessionSubmitBlockedError('distance_too_short'),
      }),
      { maxAttemptsPerRun: 3, onDeadLetter: (code) => deadLetterCodes.push(code) },
    )

    expect(mockedMarkFailed).toHaveBeenCalledWith('sid-short', 'distance_too_short')
    expect(mockedIncrementSessionAttempt).not.toHaveBeenCalled()
    expect(deadLetterCodes).toEqual(['distance_too_short'])
    expect(result).toEqual({
      attempted: 1,
      uploaded: 0,
      deadLettered: 1,
      remainingPending: 0,
    })
  })

  it('dead-letters a run that hits the transient attempt cap', async () => {
    mockedCountPendingUpload.mockResolvedValue(1)
    // Already failed transiently MAX-1 times; this pass is the last straw.
    mockedListPendingUpload.mockResolvedValue([session('sid-flaky', MAX_RETRY_ATTEMPTS - 1)])
    const deadLetterCodes: string[] = []

    const result = await runRetryQueue(
      async () => ({ kind: 'transient_failure', error: { code: 'internal_error' } }),
      { maxAttemptsPerRun: 3, onDeadLetter: (code) => deadLetterCodes.push(code) },
    )

    expect(mockedIncrementSessionAttempt).toHaveBeenCalledWith('sid-flaky', 'internal_error')
    expect(mockedMarkFailed).toHaveBeenCalledWith('sid-flaky', 'internal_error')
    expect(deadLetterCodes).toEqual(['internal_error'])
    expect(result).toEqual({
      attempted: 1,
      uploaded: 0,
      deadLettered: 1,
      remainingPending: 0,
    })
  })

  it('regression: three dead-lettered rows no longer starve a fresh run across passes', async () => {
    // Pass 1: three permanently-failing rows fill the oldest-first, limit-3 batch.
    // Each is moved to 'failed' (dropping out of the pending pool), so pass 2's
    // listPendingUpload returns the fresh row that was previously blocked.
    mockedCountPendingUpload.mockResolvedValueOnce(4).mockResolvedValueOnce(1)
    mockedListPendingUpload
      .mockResolvedValueOnce([session('dead-1'), session('dead-2'), session('dead-3')])
      .mockResolvedValueOnce([session('fresh')])

    const submit = async (sessionId: string) =>
      sessionId === 'fresh'
        ? ({ kind: 'uploaded' } as const)
        : ({ kind: 'permanent_failure', error: { code: 'distance_too_short' } } as const)

    const pass1 = await runRetryQueue(submit, { maxAttemptsPerRun: 3 })
    expect(pass1.deadLettered).toBe(3)
    expect(mockedMarkFailed).toHaveBeenCalledTimes(3)

    const pass2 = await runRetryQueue(submit, { maxAttemptsPerRun: 3 })
    expect(mockedMarkUploaded).toHaveBeenCalledWith('fresh')
    expect(pass2).toEqual({
      attempted: 1,
      uploaded: 1,
      deadLettered: 0,
      remainingPending: 0,
    })
  })
})
