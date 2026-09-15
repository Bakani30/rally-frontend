import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSportPositionsForUsers,
  listUserSportPositions,
  setUserSportPosition,
} from '@/lib/profile/sportPositionRepository'

// Map of activity_type -> preferred position_key.
export type SportPositionMap = Record<string, string>

const sportPositionsKey = (userId: string | undefined) => ['sport-positions', userId]

export function useSportPositions(userId: string | undefined) {
  return useQuery({
    queryKey: sportPositionsKey(userId),
    queryFn: async (): Promise<SportPositionMap> => {
      const rows = await listUserSportPositions(userId!)
      return Object.fromEntries(rows.map((row) => [row.activity_type, row.position_key]))
    },
    enabled: !!userId,
  })
}

export function useSportPositionsForUsers(
  userIds: string[],
  activityType: string,
  enabled: boolean,
) {
  const sorted = [...userIds].sort()
  return useQuery({
    queryKey: ['sport-positions-multi', activityType, sorted],
    queryFn: async (): Promise<Record<string, string>> => {
      const rows = await listSportPositionsForUsers(sorted, activityType)
      return Object.fromEntries(rows.map((r) => [r.user_id, r.position_key]))
    },
    enabled: enabled && sorted.length > 0,
  })
}

export function useSetSportPosition(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { activityType: string; positionKey: string }) => {
      await setUserSportPosition(input)
      return input
    },
    onMutate: (input) => {
      const previous = queryClient.getQueryData<SportPositionMap>(sportPositionsKey(userId))
      queryClient.setQueryData<SportPositionMap>(sportPositionsKey(userId), (current) => ({
        ...(current ?? {}),
        [input.activityType]: input.positionKey,
      }))
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sportPositionsKey(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sportPositionsKey(userId) })
    },
  })
}
