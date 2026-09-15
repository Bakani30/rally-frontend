import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  BlockedUser,
  BlockUserInput,
  BlockUserResult,
  ReportUserInput,
  ReportUserResult,
} from './userSafetyTypes'

export async function callReportUser(
  input: ReportUserInput,
): Promise<ReportUserResult> {
  const { data, error } = await invokeAuthenticatedFunction<ReportUserResult>(
    'block-user',
    { body: { ...input, action: 'report' } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to report user')
  if (!data) throw new Error('Empty report-user response')
  return data
}

export async function callListBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await invokeAuthenticatedFunction<{ blocked: BlockedUser[] }>(
    'block-user',
    { body: { action: 'list' } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load blocked users')
  return data?.blocked ?? []
}

export async function callSetUserBlock(
  input: BlockUserInput,
): Promise<BlockUserResult> {
  const { data, error } = await invokeAuthenticatedFunction<BlockUserResult>(
    'block-user',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update block')
  if (!data) throw new Error('Empty block-user response')
  return data
}
