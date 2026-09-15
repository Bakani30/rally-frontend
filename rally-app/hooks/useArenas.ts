import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptArenaRoundStake,
  addArenaTeamMember,
  advanceArenaQueue,
  assignArenaRoundReferee,
  applyArenaStakeTimeout,
  createArenaEvent,
  createArenaTeam,
  disputeArenaRound,
  finalizeArenaRound,
  getArenaEvent,
  joinArenaRefereePool,
  listArenaEvents,
  readyArenaTeamMember,
  startArenaRound,
  submitArenaRoundResult,
} from '@/lib/arenas/arenaRepository'
import { supabase } from '@/lib/supabase'
import type { ArenaActionOutput, ArenaCreateInput, ArenaTeamCreateInput } from '@/types/arena'

const arenaListKey = ['arena-events'] as const
const arenaDetailKey = (arenaId: string | undefined) => ['arena-event', arenaId] as const

type UseArenaOptions = { enabled?: boolean }

export function useArenaEvents(options: UseArenaOptions = {}) {
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    const channel = supabase
      .channel('arena-events-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_events' }, () => {
        queryClient.invalidateQueries({ queryKey: arenaListKey })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: arenaListKey })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_rounds' }, () => {
        queryClient.invalidateQueries({ queryKey: arenaListKey })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])

  const arenasQuery = useQuery({
    queryKey: arenaListKey,
    queryFn: listArenaEvents,
    enabled,
    staleTime: 20_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  const createArenaMutation = useMutation({
    mutationFn: (input: ArenaCreateInput) => createArenaEvent(input),
    onSuccess: (output) => applyArenaOutput(queryClient, output),
  })

  return { arenasQuery, createArenaMutation }
}

export function useArenaEvent(arenaId: string | undefined, options: UseArenaOptions = {}) {
  const queryClient = useQueryClient()
  const enabled = Boolean(arenaId) && (options.enabled ?? true)

  const invalidateArena = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: arenaDetailKey(arenaId) })
    queryClient.invalidateQueries({ queryKey: arenaListKey })
  }, [arenaId, queryClient])

  useEffect(() => {
    if (!enabled || !arenaId) return
    const channel = supabase
      .channel(`arena-event:${arenaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_events', filter: `id=eq.${arenaId}` }, invalidateArena)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_teams', filter: `arena_id=eq.${arenaId}` }, invalidateArena)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_team_members', filter: `arena_id=eq.${arenaId}` }, invalidateArena)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_referees', filter: `arena_id=eq.${arenaId}` }, invalidateArena)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_rounds', filter: `arena_id=eq.${arenaId}` }, invalidateArena)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [arenaId, enabled, invalidateArena])

  const arenaQuery = useQuery({
    queryKey: arenaDetailKey(arenaId),
    queryFn: () => getArenaEvent(arenaId!),
    enabled,
    staleTime: 10_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  const createTeamMutation = useArenaMutation(queryClient, (input: ArenaTeamCreateInput) => createArenaTeam(input))
  const addMemberMutation = useArenaMutation(queryClient, addArenaTeamMember)
  const readyMemberMutation = useArenaMutation(queryClient, readyArenaTeamMember)
  const refereeMutation = useArenaMutation(queryClient, joinArenaRefereePool)
  const assignRefereeMutation = useArenaMutation(queryClient, assignArenaRoundReferee)
  const advanceQueueMutation = useArenaMutation(queryClient, advanceArenaQueue)
  const acceptStakeMutation = useArenaMutation(queryClient, acceptArenaRoundStake)
  const startRoundMutation = useArenaMutation(queryClient, startArenaRound)
  const submitResultMutation = useArenaMutation(queryClient, submitArenaRoundResult)
  const disputeMutation = useArenaMutation(queryClient, disputeArenaRound)
  const finalizeMutation = useArenaMutation(queryClient, finalizeArenaRound)
  const timeoutMutation = useArenaMutation(queryClient, applyArenaStakeTimeout)

  return {
    arenaQuery,
    createTeamMutation,
    addMemberMutation,
    readyMemberMutation,
    refereeMutation,
    assignRefereeMutation,
    advanceQueueMutation,
    acceptStakeMutation,
    startRoundMutation,
    submitResultMutation,
    disputeMutation,
    finalizeMutation,
    timeoutMutation,
  }
}

function useArenaMutation<TInput>(
  queryClient: ReturnType<typeof useQueryClient>,
  mutationFn: (input: TInput) => Promise<ArenaActionOutput>,
) {
  return useMutation({
    mutationFn,
    onSuccess: (output) => applyArenaOutput(queryClient, output),
  })
}

function applyArenaOutput(queryClient: ReturnType<typeof useQueryClient>, output: ArenaActionOutput) {
  if (output.arena) {
    queryClient.setQueryData(arenaDetailKey(output.arenaId), output.arena)
  }
  queryClient.invalidateQueries({ queryKey: arenaListKey })
  queryClient.invalidateQueries({ queryKey: arenaDetailKey(output.arenaId) })
  if (output.matchId) {
    queryClient.invalidateQueries({ queryKey: ['match', output.matchId] })
    queryClient.invalidateQueries({ queryKey: ['my-matches'] })
    queryClient.invalidateQueries({ queryKey: ['wallet-summary'] })
  }
}
