import { useQuery } from '@tanstack/react-query'
import { listInvitableFriends } from '@/lib/match/inviteDirectoryService'
import type { InvitableFriend } from '@/types/invite'

/**
 * Friends who can be invited to a match (with rank, recent/suggested flags,
 * and latest invite state). Enabled only while the sheet is open and we have a
 * match id.
 */
export function useInvitableFriends(matchId: string | undefined, enabled: boolean) {
  return useQuery<InvitableFriend[]>({
    queryKey: ['invitable-friends', matchId],
    queryFn: () => listInvitableFriends(matchId!),
    enabled: enabled && !!matchId,
    staleTime: 10_000,
  })
}
