import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBlockedUsers, reportUser, setUserBlock } from '@/lib/users/userSafetyService'
import type {
  BlockedUser,
  BlockUserResult,
  ReportUserInput,
  ReportUserResult,
} from '@/lib/users/userSafetyTypes'

export function useBlockedUsers(enabled = true) {
  return useQuery<BlockedUser[]>({
    queryKey: ['blocked-users'],
    queryFn: listBlockedUsers,
    enabled,
    staleTime: 15_000,
  })
}

export function useReportUser() {
  return useMutation<ReportUserResult, Error, ReportUserInput>({
    mutationFn: (input) => reportUser(input),
  })
}

export function useSetUserBlock() {
  const queryClient = useQueryClient()
  return useMutation<
    BlockUserResult,
    Error,
    { targetUserId: string; action: 'block' | 'unblock' }
  >({
    mutationFn: (input) => setUserBlock(input),
    // Block tears down friendship rows in either direction (server side),
    // so any list that mirrors friend state must refetch.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests', 'incoming'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests', 'outgoing'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },
  })
}
