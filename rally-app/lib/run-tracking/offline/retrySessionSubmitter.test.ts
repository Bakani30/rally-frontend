import { describe, expect, it } from 'vitest'
import { createRetrySessionSubmitter } from './retrySessionSubmitter'

describe('createRetrySessionSubmitter', () => {
  it('maps a fresh submit to uploaded', async () => {
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({ alreadyExists: false }),
    })

    await expect(submitter('sid-1')).resolves.toEqual({ kind: 'uploaded' })
  })

  it('maps an idempotent duplicate to already_uploaded', async () => {
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({ alreadyExists: true }),
    })

    await expect(submitter('sid-1')).resolves.toEqual({ kind: 'already_uploaded' })
  })

  it('links a retried match run before marking it uploaded', async () => {
    const linked: unknown[] = []
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({
        alreadyExists: false,
        activitySessionId: 'activity-1',
        matchId: 'match-1',
        serverDistanceMeters: 5100,
        serverPaceSecondsPerKm: 360,
      }),
      linkMatchRun: async (input) => {
        linked.push(input)
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({ kind: 'uploaded' })
    expect(linked).toEqual([
      {
        matchId: 'match-1',
        activitySessionId: 'activity-1',
        serverDistanceMeters: 5100,
        serverPaceSecondsPerKm: 360,
      },
    ])
  })

  it('keeps a match run pending when link fails transiently', async () => {
    const error = new Error('Network request failed')
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({
        alreadyExists: true,
        activitySessionId: 'activity-1',
        matchId: 'match-1',
      }),
      linkMatchRun: async () => {
        throw error
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({
      kind: 'transient_failure',
      error,
    })
  })

  it('verifies a retried route challenge before marking it uploaded', async () => {
    const verified: unknown[] = []
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({
        alreadyExists: false,
        activitySessionId: 'activity-1',
        challengeId: 'challenge-1',
      }),
      verifyRouteChallenge: async (input) => {
        verified.push(input)
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({ kind: 'uploaded' })
    expect(verified).toEqual([
      {
        challengeId: 'challenge-1',
        activitySessionId: 'activity-1',
      },
    ])
  })

  it('keeps a route challenge retry pending when route verification fails transiently', async () => {
    const error = new Error('Network request failed')
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({
        alreadyExists: true,
        activitySessionId: 'activity-1',
        challengeId: 'challenge-1',
      }),
      verifyRouteChallenge: async () => {
        throw error
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({
      kind: 'transient_failure',
      error,
    })
  })

  it('does not keep an uploaded route run pending for permanent route verification failures', async () => {
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => ({
        alreadyExists: false,
        activitySessionId: 'activity-1',
        challengeId: 'challenge-1',
      }),
      verifyRouteChallenge: async () => {
        throw new Error('path_too_sparse')
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({ kind: 'uploaded' })
  })

  it('classifies local validation/source failures as permanent', async () => {
    const error = new Error('gps_live source: session sid-1 has insufficient path points')
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => {
        throw error
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({
      kind: 'permanent_failure',
      error,
    })
  })

  it('classifies unknown failures as transient', async () => {
    const error = new Error('Network request failed')
    const submitter = createRetrySessionSubmitter({
      submitSession: async () => {
        throw error
      },
    })

    await expect(submitter('sid-1')).resolves.toEqual({
      kind: 'transient_failure',
      error,
    })
  })
})
