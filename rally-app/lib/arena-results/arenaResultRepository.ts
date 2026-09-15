import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  ApproveArenaResultInput,
  ArenaResultActionInput,
  ArenaResultActionOutput,
  MutualCancelArenaResultInput,
  RequestArenaResultCorrectionInput,
  SubmitArenaResultInput,
} from '@/types/arenaResult'

export async function fetchArenaResultSnapshot(matchId: string): Promise<unknown> {
  const { data, error } = await invokeAuthenticatedFunction<unknown>(
    `arena-events?view=result&matchId=${encodeURIComponent(matchId)}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena result')
  return data
}

export function submitArenaResult(input: SubmitArenaResultInput): Promise<ArenaResultActionOutput> {
  const body: Extract<ArenaResultActionInput, { action: 'submit_basketball_result' }> = {
    action: 'submit_basketball_result',
    matchId: input.matchId,
    side0Score: input.side0Score,
    side1Score: input.side1Score,
    expectedReviewEpoch: input.expectedReviewEpoch,
  }
  if (input.note !== undefined) body.note = input.note
  return invokeArenaResultAction(body)
}

export function approveArenaResult(input: ApproveArenaResultInput): Promise<ArenaResultActionOutput> {
  return invokeArenaResultAction({
    action: 'approve_basketball_result',
    matchId: input.matchId,
    resultVersion: input.resultVersion,
    payloadHash: input.payloadHash,
    expectedReviewEpoch: input.expectedReviewEpoch,
  })
}

export function requestArenaResultCorrection(
  input: RequestArenaResultCorrectionInput,
): Promise<ArenaResultActionOutput> {
  const body: Extract<ArenaResultActionInput, { action: 'request_basketball_result_correction' }> = {
    action: 'request_basketball_result_correction',
    matchId: input.matchId,
    resultVersion: input.resultVersion,
    payloadHash: input.payloadHash,
    expectedReviewEpoch: input.expectedReviewEpoch,
  }
  if (input.note !== undefined) body.note = input.note
  return invokeArenaResultAction(body)
}

export function mutualCancelArenaResult(
  input: MutualCancelArenaResultInput,
): Promise<ArenaResultActionOutput> {
  if (input.cancelAction === 'request') {
    return invokeArenaResultAction({
      action: 'mutual_cancel_basketball_round',
      matchId: input.matchId,
      cancelAction: 'request',
      expectedReviewEpoch: input.expectedReviewEpoch,
    })
  }
  return invokeArenaResultAction({
    action: 'mutual_cancel_basketball_round',
    matchId: input.matchId,
    cancelAction: input.cancelAction,
    cancelRequestId: input.cancelRequestId,
    expectedReviewEpoch: input.expectedReviewEpoch,
  })
}

async function invokeArenaResultAction(
  input: ArenaResultActionInput,
): Promise<ArenaResultActionOutput> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaResultActionOutput>('arena-events', {
    body: input,
  })
  if (error) throw await extractEdgeFunctionError(error, 'Arena result action failed')
  if (!data) throw new Error('arena-events returned no result action output')
  return data
}
