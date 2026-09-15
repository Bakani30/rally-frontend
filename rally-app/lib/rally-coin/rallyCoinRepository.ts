import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { ResolveRallyCoinInput, ResolveRallyCoinResult } from './rallyCoinTypes'

export async function resolveRallyCoin(
  input: ResolveRallyCoinInput,
): Promise<ResolveRallyCoinResult> {
  const { data, error } = await invokeAuthenticatedFunction<ResolveRallyCoinResult>(
    'resolve-rally-coin',
    {
      body: {
        publicCode: input.publicCode,
        source: input.source ?? 'nfc',
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to open Rally Coin')
  if (!data?.coin?.publicCode) throw new Error('resolve-rally-coin returned no coin')
  return data
}
