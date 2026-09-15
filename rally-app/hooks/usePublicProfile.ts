import { useQuery } from '@tanstack/react-query'
import { getPublicProfileView } from '@/lib/profile/profileService'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'

export function usePublicProfile(input: { userId?: string; handle?: string }) {
  const key = input.userId ? `id:${input.userId}` : input.handle ? `handle:${input.handle}` : undefined

  return useQuery({
    queryKey: profileQueryKeys.public(key),
    queryFn: () => getPublicProfileView(input),
    enabled: !!key,
    staleTime: 30_000,
  })
}
