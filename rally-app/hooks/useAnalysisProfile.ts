import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { analysisProfileQueryKeys } from '@/lib/profile/analysisProfileQueryKeys'
import {
  getUserAnalysisProfile,
  saveUserAnalysisProfile,
  type UpdateAnalysisProfileInput,
} from '@/lib/profile/analysisProfileService'

export function useAnalysisProfile(userId: string | undefined) {
  return useQuery({
    queryKey: analysisProfileQueryKeys.detail(userId),
    queryFn: getUserAnalysisProfile,
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useUpdateAnalysisProfile(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAnalysisProfileInput) => saveUserAnalysisProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(analysisProfileQueryKeys.detail(userId), profile)
      void queryClient.invalidateQueries({
        queryKey: analysisProfileQueryKeys.detail(userId),
      })
    },
  })
}
