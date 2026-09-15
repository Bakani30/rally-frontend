import { useQuery } from '@tanstack/react-query'
import { useAccountRealtime } from '@/hooks/useAccountRealtime'
import { getHomeProfile, getProfile } from '@/lib/profile/profileService'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'

export function useHomeProfile(userId: string | undefined) {
  useAccountRealtime(userId)

  return useQuery({
    queryKey: profileQueryKeys.summary(userId),
    queryFn: () => getHomeProfile(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useProfile(userId: string | undefined) {
  useAccountRealtime(userId)

  return useQuery({
    queryKey: profileQueryKeys.detail(userId),
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
