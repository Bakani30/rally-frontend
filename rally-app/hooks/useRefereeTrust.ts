import { useQuery } from '@tanstack/react-query'
import { getRefereeSportProfileRecord } from '@/lib/match/refereeTrustRepository'

export function useRefereeSportProfile(refereeUserId: string | undefined, activityType: string | undefined) {
  return useQuery({
    queryKey: ['referee-sport-profile', refereeUserId, activityType],
    queryFn: () => getRefereeSportProfileRecord(refereeUserId!, activityType!),
    enabled: !!refereeUserId && (activityType === 'basketball' || activityType === 'badminton'),
    staleTime: 60_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}
