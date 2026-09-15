import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  canManageProfileHighlightVideo,
  deleteProfileHighlightVideo,
  getProfileHighlightVideo,
  saveProfileHighlightVideo,
  type SaveProfileHighlightVideoInput,
} from '@/lib/profile/profileHighlightService'

export const profileHighlightKey = (userId: string | undefined, matchId: string | undefined) =>
  ['profile-highlight-video', userId, matchId] as const

export const profileHighlightAccessKey = (userId: string | undefined, matchId: string | undefined) =>
  ['profile-highlight-access', userId, matchId] as const

export function useProfileHighlightVideo(userId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: profileHighlightKey(userId, matchId),
    queryFn: () => getProfileHighlightVideo(userId!, matchId!),
    enabled: !!userId && !!matchId,
    staleTime: 50 * 60 * 1000,
  })
}

export function useCanManageProfileHighlightVideo(userId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: profileHighlightAccessKey(userId, matchId),
    queryFn: () => canManageProfileHighlightVideo(userId!, matchId!),
    enabled: !!userId && !!matchId,
    staleTime: 30_000,
  })
}

export function useUploadProfileHighlightVideo(userId: string | undefined, matchId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<SaveProfileHighlightVideoInput, 'userId' | 'matchId'>) => {
      if (!userId || !matchId) throw new Error('User and match are required')
      return saveProfileHighlightVideo({ ...input, userId, matchId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileHighlightKey(userId, matchId) })
    },
    // A replacement can succeed in Postgres but still report an old-object
    // cleanup failure. Refetch so the active new clip is not hidden by stale
    // cache data while the caller surfaces the cleanup error.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: profileHighlightKey(userId, matchId) })
    },
  })
}

export function useDeleteProfileHighlightVideo(userId: string | undefined, matchId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!userId || !matchId) throw new Error('User and match are required')
      return deleteProfileHighlightVideo(userId, matchId)
    },
    onSuccess: () => {
      queryClient.setQueryData(profileHighlightKey(userId, matchId), null)
    },
  })
}
