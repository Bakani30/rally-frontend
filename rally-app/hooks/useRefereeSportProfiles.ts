import { useRefereeSportProfile } from '@/hooks/useRefereeTrust'
import type { RefereeSportProfile } from '@/types/match'

export type RefereeSportProfileEntry = {
  activityType: 'basketball' | 'badminton'
  profile: RefereeSportProfile | null
  isPending: boolean
}

// Convenience: load the trust profiles for every sport that has a referee
// ladder (basketball + badminton). There is no batch endpoint, so this just
// fans out the per-sport query — a fixed count keeps rules-of-hooks happy.
export function useRefereeSportProfiles(userId: string | undefined) {
  const basketball = useRefereeSportProfile(userId, 'basketball')
  const badminton = useRefereeSportProfile(userId, 'badminton')

  return {
    basketball: {
      activityType: 'basketball' as const,
      profile: basketball.data ?? null,
      isPending: basketball.isPending,
    },
    badminton: {
      activityType: 'badminton' as const,
      profile: badminton.data ?? null,
      isPending: badminton.isPending,
    },
    isPending: basketball.isPending || badminton.isPending,
    isError: basketball.isError || badminton.isError,
    refetch: () => Promise.all([basketball.refetch(), badminton.refetch()]),
  }
}
