import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  contributeGuildGoal,
  getGuildGoalContributionForSession,
  listActiveGuildGoalsForUser,
} from '@/lib/guild/guildGoalRepository'
import type { ContributeGuildGoalInput } from '@/lib/guild/guildGoalTypes'
import { useActiveGuildGoalStore } from '@/stores/activeGuildGoalStore'

export const guildGoalQueryKeys = {
  active: (userId: string | undefined) => ['guild-goals', 'active', userId] as const,
  contributionForSession: (activitySessionId: string | undefined) =>
    ['guild-goals', 'contribution', activitySessionId] as const,
}

export function useActiveGuildGoal(userId: string | undefined) {
  const selectedGoalId = useActiveGuildGoalStore((state) => state.selectedGoalId)
  const query = useQuery({
    queryKey: guildGoalQueryKeys.active(userId),
    queryFn: () => listActiveGuildGoalsForUser(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  const activeGoal = useMemo(() => {
    const goals = query.data ?? []
    return goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null
  }, [query.data, selectedGoalId])

  return {
    ...query,
    goals: query.data ?? [],
    activeGoal,
  }
}

export function useContributeGuildGoal(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ContributeGuildGoalInput) => contributeGuildGoal(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: guildGoalQueryKeys.active(userId) })
      queryClient.invalidateQueries({
        queryKey: guildGoalQueryKeys.contributionForSession(result.activitySessionId),
      })
    },
  })
}

export function useGuildGoalContributionForSession(activitySessionId: string | undefined) {
  return useQuery({
    queryKey: guildGoalQueryKeys.contributionForSession(activitySessionId),
    queryFn: () => getGuildGoalContributionForSession(activitySessionId!),
    enabled: Boolean(activitySessionId),
    staleTime: 30_000,
  })
}
