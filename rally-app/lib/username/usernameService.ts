import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { ChangeUsernameInput, ChangeUsernameResult } from '@/types/username'

export async function changeUsername(
  input: ChangeUsernameInput,
): Promise<ChangeUsernameResult> {
  const { data, error } = await invokeAuthenticatedFunction<ChangeUsernameResult>(
    'change-username',
    { body: { username: input.username.trim() } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to change username')
  if (!data) throw new Error('No response from change-username')
  return data
}
