import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

export type AnalyticsIdentity = {
  distinctId: string
}

let cachedIdentity: {
  userId: string
  promise: Promise<AnalyticsIdentity>
} | null = null

export function clearCachedAnalyticsIdentity(): void {
  cachedIdentity = null
}

export async function fetchAnalyticsIdentity(userId: string): Promise<AnalyticsIdentity> {
  if (cachedIdentity?.userId === userId) return cachedIdentity.promise

  const promise = invokeAnalyticsIdentity()
  cachedIdentity = { userId, promise }
  try {
    return await promise
  } catch (error) {
    if (cachedIdentity?.promise === promise) cachedIdentity = null
    throw error
  }
}

async function invokeAnalyticsIdentity(): Promise<AnalyticsIdentity> {
  const { data, error } = await invokeAuthenticatedFunction<AnalyticsIdentity>('analytics-identity')
  if (error) throw await extractEdgeFunctionError(error, 'Failed to resolve analytics identity')
  if (!data?.distinctId) throw new Error('analytics-identity returned no distinctId')
  return data
}
