import { describe, expect, it } from 'vitest'

import { deriveArenaResultPresentation } from '@/lib/arena-results/arenaResultPresentation'

import {
  ARENA_MATCH_CANCELABLE_STATES,
  ARENA_MATCH_LIFECYCLE_STATES,
  createArenaMatchPreviewState,
  getArenaMatchLifecycleFixture,
  getArenaMatchPreviewActions,
  parseArenaMatchPreviewRoute,
  serializeArenaMatchPreviewRoute,
  transitionArenaMatchPreview,
} from './arenaMatchLifecyclePreview'

const matchId = 'preview match/1'

describe('arena match lifecycle preview URL codec', () => {
  it('keeps the closed shared-result scenario table', () => {
    expect(ARENA_MATCH_LIFECYCLE_STATES).toEqual([
      'ready_to_submit',
      'submitted_v2_zero_approvals',
      'submitted_v2_side0_approved',
      'submitted_v2_side1_approved',
      'correction_requested_by_side0',
      'correction_requested_by_side1',
      'resubmitted_v3_zero_approvals',
      'resubmitted_v3_side0_approved',
      'resubmitted_v3_side1_approved',
      'cancel_requested_by_side0',
      'cancel_requested_by_side1',
      'held',
      'settled_v2_side0_winner',
      'settled_v2_side1_winner',
      'settled_v3_side0_winner',
      'settled_v3_side1_winner',
      'cancelled_refunded',
    ])
  })

  it('serializes and fresh-parses every required canonical field', () => {
    const preview = createArenaMatchPreviewState('submitted_v2_side0_approved', 'a', { sideA: 21, sideB: 17 })
    const href = serializeArenaMatchPreviewRoute({ matchId, preview, captain: 'b' })

    expect(href).toBe('/dev/arena-match-preview?state=submitted_v2_side0_approved&matchId=preview%20match%2F1&captain=b&side0Score=21&side1Score=17&reviewEpoch=2')
    expect(parseArenaMatchPreviewRoute(query(href!))).toEqual({
      kind: 'preview',
      matchId,
      preview: createArenaMatchPreviewState('submitted_v2_side0_approved', 'b', { sideA: 21, sideB: 17 }, undefined, 2),
    })
  })

  it('rejects out-of-range scores when generating a canonical URL', () => {
    expect(serializeArenaMatchPreviewRoute({
      matchId,
      captain: 'a',
      preview: createArenaMatchPreviewState('ready_to_submit', 'a', { sideA: 10_001, sideB: 17 }),
    })).toBeNull()
  })

  it.each([
    ['ready_to_submit', 1],
    ['submitted_v2_zero_approvals', 2],
    ['correction_requested_by_side0', 3],
    ['resubmitted_v3_zero_approvals', 4],
    ['settled_v2_side0_winner', 2],
    ['settled_v3_side0_winner', 4],
  ] as const)('uses deterministic state-selector epoch %s → %i', (state, reviewEpoch) => {
    expect(createArenaMatchPreviewState(state, 'a', { sideA: 21, sideB: 17 }).reviewEpoch).toBe(reviewEpoch)
  })

  it.each([
    [{}, 'missing'],
    [{ state: 'ready_to_submit', matchId, captain: 'a', side0Score: '21', side1Score: '17' }, 'missing'],
    [{ state: 'unknown', matchId, captain: 'a', side0Score: '21', side1Score: '17', reviewEpoch: '1' }, 'invalid'],
    [{ state: 'ready_to_submit', matchId, captain: 'A', side0Score: '21', side1Score: '17', reviewEpoch: '1' }, 'invalid'],
    [{ state: 'ready_to_submit', matchId: ' ', captain: 'a', side0Score: '21', side1Score: '17', reviewEpoch: '1' }, 'invalid'],
    [{ state: 'ready_to_submit', matchId, captain: 'a', side0Score: '-1', side1Score: '17', reviewEpoch: '1' }, 'invalid'],
    [{ state: 'ready_to_submit', matchId, captain: 'a', side0Score: '10001', side1Score: '17', reviewEpoch: '1' }, 'invalid'],
    [{ state: 'ready_to_submit', matchId, captain: 'a', side0Score: '21', side1Score: '17', reviewEpoch: '0' }, 'invalid'],
    [{ state: ['ready_to_submit', 'held'], matchId, captain: 'a', side0Score: '21', side1Score: '17' }, 'duplicate'],
    [{ state: 'ready_to_submit', matchId, captain: 'a', side0Score: '21', side1Score: '17', reviewEpoch: ['1', '1'] }, 'duplicate'],
    [{ state: 'cancel_requested_by_side0', matchId, captain: 'a', side0Score: '21', side1Score: '17', reviewEpoch: '3' }, 'missing_cancelled_from'],
  ])('fails closed for %s', (params, reason) => {
    expect(parseArenaMatchPreviewRoute(params)).toEqual({ kind: 'read_only', reason })
  })

  it('reconstructs cancellation from a fresh counterpart URL for every source and requester side', () => {
    for (const source of ARENA_MATCH_CANCELABLE_STATES) {
      for (const requester of ['a', 'b'] as const) {
        const requested = transitionArenaMatchPreview(
          createArenaMatchPreviewState(source, requester, { sideA: 21, sideB: 17 }),
          'request_cancel',
        )
        const counterpart = requester === 'a' ? 'b' : 'a'
        const href = serializeArenaMatchPreviewRoute({ matchId, preview: requested, captain: counterpart })
        const parsed = parseArenaMatchPreviewRoute(query(href!))
        const requesterHref = serializeArenaMatchPreviewRoute({ matchId, preview: requested, captain: requester })
        const requesterParsed = parseArenaMatchPreviewRoute(query(requesterHref!))

        expect(parsed).toMatchObject({
          kind: 'preview',
          matchId,
          preview: { state: requester === 'a' ? 'cancel_requested_by_side0' : 'cancel_requested_by_side1', captain: counterpart, cancelledFrom: source },
        })
        if (parsed.kind === 'preview') {
          expect(getArenaMatchPreviewActions(parsed.preview.state, parsed.preview.captain))
            .toEqual(['agree_cancel', 'decline_cancel'])
          expect(transitionArenaMatchPreview(parsed.preview, 'decline_cancel')).toMatchObject({
            state: source,
            captain: counterpart,
            reviewEpoch: requested.reviewEpoch + 1,
          })
        }
        if (requesterParsed.kind === 'preview') {
          expect(transitionArenaMatchPreview(requesterParsed.preview, 'withdraw_cancel')).toMatchObject({
            state: source,
            captain: requester,
            reviewEpoch: requested.reviewEpoch + 1,
          })
        }
      }
    }
  })

  it('resyncs preview state from changed route params instead of retaining the old captain or score', () => {
    const a = parseArenaMatchPreviewRoute(query(serializeArenaMatchPreviewRoute({
      matchId,
      preview: createArenaMatchPreviewState('ready_to_submit', 'a', { sideA: 21, sideB: 17 }),
      captain: 'a',
    })!))
    const b = parseArenaMatchPreviewRoute(query(serializeArenaMatchPreviewRoute({
      matchId,
      preview: createArenaMatchPreviewState('submitted_v2_side1_approved', 'b', { sideA: 17, sideB: 21 }),
      captain: 'b',
    })!))

    expect(a).toMatchObject({ kind: 'preview', preview: { captain: 'a', score: { sideA: 21, sideB: 17 } } })
    expect(b).toMatchObject({ kind: 'preview', preview: { captain: 'b', score: { sideA: 17, sideB: 21 } } })
  })

  it('round-trips review epoch across fresh A/B lifecycle URLs', () => {
    const ready = createArenaMatchPreviewState('ready_to_submit', 'a', { sideA: 21, sideB: 17 })
    const submitted = transitionArenaMatchPreview(ready, 'submit_result')
    const correction = transitionArenaMatchPreview({ ...submitted, captain: 'b' }, 'request_correction')
    const resubmitted = transitionArenaMatchPreview(correction, 'submit_result')

    expect([ready.reviewEpoch, submitted.reviewEpoch, correction.reviewEpoch, resubmitted.reviewEpoch]).toEqual([1, 2, 3, 4])
    expect(parseArenaMatchPreviewRoute(query(serializeArenaMatchPreviewRoute({ matchId, preview: resubmitted, captain: 'a' })!)))
      .toMatchObject({ kind: 'preview', preview: { captain: 'a', reviewEpoch: 4 } })
  })

  it('increments cancellation authority epochs while approvals keep their epoch', () => {
    const approved = transitionArenaMatchPreview(
      createArenaMatchPreviewState('submitted_v2_zero_approvals', 'a', { sideA: 21, sideB: 17 }),
      'approve_result',
    )
    const requested = transitionArenaMatchPreview(approved, 'request_cancel')
    const responder = parseArenaMatchPreviewRoute(query(serializeArenaMatchPreviewRoute({ matchId, preview: requested, captain: 'b' })!))
    if (responder.kind !== 'preview') throw new Error('expected responder preview')
    const declined = transitionArenaMatchPreview(responder.preview, 'decline_cancel')

    expect(approved.reviewEpoch).toBe(2)
    expect(requested.reviewEpoch).toBe(3)
    expect(declined).toMatchObject({ state: 'submitted_v2_side0_approved', reviewEpoch: 4 })
  })

  it('keeps review epoch stable through approvals, settlement, and cancellation agreement', () => {
    const firstApproval = transitionArenaMatchPreview(
      createArenaMatchPreviewState('submitted_v2_zero_approvals', 'a', { sideA: 21, sideB: 17 }),
      'approve_result',
    )
    const settled = transitionArenaMatchPreview({ ...firstApproval, captain: 'b' }, 'approve_result')
    const cancellation = transitionArenaMatchPreview(firstApproval, 'request_cancel')
    const agreed = transitionArenaMatchPreview({ ...cancellation, captain: 'b' }, 'agree_cancel')

    expect(firstApproval.reviewEpoch).toBe(2)
    expect(settled).toMatchObject({ state: 'settled_v2_side0_winner', reviewEpoch: 2 })
    expect(cancellation.reviewEpoch).toBe(3)
    expect(agreed).toMatchObject({ state: 'cancelled_refunded', reviewEpoch: 3 })
  })

  it('settles from the non-tied URL score instead of stale mutable winner state', () => {
    const settled = transitionArenaMatchPreview(
      createArenaMatchPreviewState('submitted_v2_side0_approved', 'b', { sideA: 17, sideB: 21 }),
      'approve_result',
    )

    expect(settled).toMatchObject({ state: 'settled_v2_side1_winner', score: { sideA: 17, sideB: 21 } })
  })

  it('keeps V3 review terminal from correction instead of inventing V4', () => {
    expect(getArenaMatchPreviewActions('resubmitted_v3_zero_approvals', 'a')).not.toContain('request_correction')
    expect(getArenaMatchLifecycleFixture(createArenaMatchPreviewState(
      'resubmitted_v3_zero_approvals', 'a', { sideA: 21, sideB: 17 },
    ), matchId).snapshot.actor.capabilities.canRequestCorrection).toBe(false)
  })

  it('uses stable round identities and advances review epoch with V3', () => {
    const v2 = getArenaMatchLifecycleFixture(createArenaMatchPreviewState(
      'submitted_v2_side0_approved', 'a', { sideA: 21, sideB: 17 },
    ), matchId).snapshot
    const v3 = getArenaMatchLifecycleFixture(createArenaMatchPreviewState(
      'resubmitted_v3_side0_approved', 'a', { sideA: 21, sideB: 17 },
    ), matchId).snapshot

    const correction = getArenaMatchLifecycleFixture(createArenaMatchPreviewState(
      'correction_requested_by_side0', 'a', { sideA: 21, sideB: 17 },
    ), matchId).snapshot
    expect(v3).toMatchObject({ arenaEventId: v2.arenaEventId, roundId: v2.roundId, reviewEpoch: 4 })
    expect(correction).toMatchObject({ reviewEpoch: 3, currentResult: { kind: 'awaiting_resubmission', resultVersion: 2, statsVersion: 3, payloadHash: 'a'.repeat(64) } })
    expect(v2.reviewEpoch).toBe(2)
    expect(deriveArenaResultPresentation(v3).mutations.requestCorrection).toBe(false)
  })

  it('keeps shared snapshot facts equal between captain URLs', () => {
    for (const state of ARENA_MATCH_LIFECYCLE_STATES) {
      const cancelledFrom = state.startsWith('cancel_requested_') ? 'submitted_v2_side0_approved' : undefined
      const a = getArenaMatchLifecycleFixture(createArenaMatchPreviewState(state, 'a', { sideA: 21, sideB: 17 }, cancelledFrom), matchId).snapshot
      const b = getArenaMatchLifecycleFixture(createArenaMatchPreviewState(state, 'b', { sideA: 21, sideB: 17 }, cancelledFrom), matchId).snapshot
      expect(sharedSnapshotFacts(a)).toEqual(sharedSnapshotFacts(b))
    }
  })
})

function query(href: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(href.split('?')[1]).entries())
}

function sharedSnapshotFacts(snapshot: ReturnType<typeof getArenaMatchLifecycleFixture>['snapshot']) {
  const result = snapshot.currentResult?.kind === 'submitted'
    ? { ...snapshot.currentResult, approvals: { ...snapshot.currentResult.approvals, actorApproved: undefined }, stats: snapshot.currentResult.stats.map(({ isActor: _isActor, ...stat }) => stat) }
    : snapshot.currentResult?.kind === 'awaiting_resubmission'
      ? { ...snapshot.currentResult, requestedByActor: undefined }
      : null
  const outcome = snapshot.outcome?.status === 'cancelled'
    ? { ...snapshot.outcome, actorOutcome: undefined, rotation: { ...snapshot.outcome.rotation, actorQueuePosition: undefined } }
    : snapshot.outcome?.status === 'settled'
      ? { ...snapshot.outcome, actorOutcome: undefined }
      : null
  return { arenaEventId: snapshot.arenaEventId, roundId: snapshot.roundId, matchId: snapshot.matchId, phase: snapshot.phase, reviewEpoch: snapshot.reviewEpoch, matchStatus: snapshot.matchStatus, roundStatus: snapshot.roundStatus, cancellation: { status: snapshot.cancellation.status, cancelRequestId: snapshot.cancellation.cancelRequestId }, currentResult: result, outcome }
}
