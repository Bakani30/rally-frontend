import { useQuery } from '@tanstack/react-query'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import { getStats } from '@/lib/profile/profileService'

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKeys.stats(userId),
    queryFn: () => getStats(userId!),
    enabled: !!userId,
  })
}
