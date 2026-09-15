import { useQuery } from '@tanstack/react-query'

import {
  getFriendCandidates,
  type FriendCandidate,
} from '@/lib/users/friendCandidateService'
import { FRIEND_CANDIDATE_MOCKS } from '@/lib/users/friendCandidateMockFixture'

declare const __DEV__: boolean

export type { FriendCandidate }

const FRIEND_CANDIDATES_STALE_TIME = 5 * 60 * 1000

export function useFriendCandidates(userId?: string) {
  const useMockCandidates =
    __DEV__ && process.env.EXPO_PUBLIC_FRIENDS_CANDIDATE_MOCK === 'true'

  return useQuery<FriendCandidate[]>({
    queryKey: ['friend-candidates', userId, useMockCandidates ? 'mock' : 'real'],
    queryFn: useMockCandidates
      ? async () => [...FRIEND_CANDIDATE_MOCKS]
      : getFriendCandidates,
    enabled: Boolean(userId),
    staleTime: FRIEND_CANDIDATES_STALE_TIME,
    retry: 1,
  })
}
