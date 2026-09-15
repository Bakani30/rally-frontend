import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createActivityMemory } from '@/lib/activities/memory/activityMemoryService'
import type { CreateActivityMemoryInput } from '@/lib/activities/memory/activityMemoryTypes'

export function useCreateActivityMemory(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateActivityMemoryInput) => createActivityMemory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-history', userId] })
    },
  })
}
