import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import { setJerseyNumber } from '@/lib/profile/profileService'

export function useJerseyNumber(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (value: number) => setJerseyNumber(value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
      qc.invalidateQueries({ queryKey: ['match'] })
    },
  })
}
