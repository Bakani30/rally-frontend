import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { SubmissionInput, SubmissionResult } from './submissionTypes'

export async function submitActivityRecord(input: SubmissionInput): Promise<SubmissionResult> {
  const { data, error } = await invokeAuthenticatedFunction<SubmissionResult>('submit-activity', {
    body: {
      matchId: input.matchId,
      activityType: input.activityType,
      data: input.data,
      activitySessionId: input.activitySessionId ?? null,
      mediaPaths: input.mediaPaths ?? [],
      claimedWinnerUserId: input.claimedWinnerUserId ?? null,
      isTie: input.isTie ?? false,
      notes: input.notes ?? null,
      contributions: input.contributions ?? [],
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to submit activity')
  if (!data) throw new Error('submit-activity returned no data')
  return data
}
