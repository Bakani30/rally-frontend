import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  applyAlphaReferee,
  assignMatchReferee,
  listAlphaRefereeEligibility,
  listAlphaRefereeDuties,
  requestAlphaRefereeResultCorrection,
  setAlphaRefereeQuarterBoundaries,
  submitRefereeMatchResult,
  upsertAlphaRefereeLiveScoreDraft,
  upsertAlphaRefereeRunningDraft,
  type AlphaRefereeActivity,
  type AssignMatchRefereeInput,
  type RequestAlphaRefereeResultCorrectionInput,
  type SetAlphaRefereeQuarterBoundariesInput,
  type SubmitRefereeMatchResultInput,
  type UpsertAlphaRefereeLiveScoreDraftInput,
  type UpsertAlphaRefereeRunningDraftInput,
} from '@/lib/match/alphaRefereeService'
import { broadcastMatchLifecycleRealtimeChange } from '@/lib/match/matchRealtime'
import { notificationSummaryQueryKey } from '@/lib/notifications/notificationSummary'
import { supabase } from '@/lib/supabase'
import type { AlphaRefereeDuty, MatchWithRelations } from '@/types/match'

export function alphaRefereeDutiesQueryKey(userId: string | undefined) {
  return ['alpha-referee-duties', userId] as const
}

export function alphaRefereeEligibilityQueryKey(userId: string | undefined) {
  return ['alpha-referee-eligibility', userId] as const
}

export function useAlphaRefereeEligibility(userId: string | undefined) {
  return useQuery({
    queryKey: alphaRefereeEligibilityQueryKey(userId),
    queryFn: () => listAlphaRefereeEligibility({
      activityTypes: ['running', 'basketball', 'badminton'],
    }),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useApplyAlphaReferee(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityType: AlphaRefereeActivity) => applyAlphaReferee({ activityType }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: alphaRefereeEligibilityQueryKey(userId) })
    },
  })
}

export function useAlphaRefereeDuties(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const topic = `alpha-referee-duties:${userId}`
    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
      queryClient.invalidateQueries({ queryKey: notificationSummaryQueryKey(userId) })
    }

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_referee_assignments', filter: `referee_user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alpha_referee_result_submissions', filter: `referee_user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alpha_referee_live_score_drafts', filter: `referee_user_id=eq.${userId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alpha_referee_running_drafts', filter: `referee_user_id=eq.${userId}` },
        invalidate,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { id?: string }
        const current = queryClient.getQueryData<{ duties: AlphaRefereeDuty[] }>(alphaRefereeDutiesQueryKey(userId))
        if (row.id && current?.duties.some((duty) => duty.matchId === row.id)) invalidate()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])

  return useQuery({
    queryKey: alphaRefereeDutiesQueryKey(userId),
    queryFn: () => listAlphaRefereeDuties(),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useAssignMatchReferee(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AssignMatchRefereeInput) => assignMatchReferee(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}

export function useUpsertAlphaRefereeLiveScoreDraft(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertAlphaRefereeLiveScoreDraftInput) => upsertAlphaRefereeLiveScoreDraft(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}

export function useSetAlphaRefereeQuarterBoundaries(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetAlphaRefereeQuarterBoundariesInput) => setAlphaRefereeQuarterBoundaries(input),
    // Optimistically stamp the boundaries onto the cached live-score draft so
    // the referee's quarter row appears instantly; the server row (realtime +
    // invalidate below) stays authoritative for every other device.
    onMutate: (input) => {
      const previous = queryClient.getQueryData<MatchWithRelations>(['match', matchId])
      queryClient.setQueryData<MatchWithRelations>(['match', matchId], (old) => {
        if (!old || !old.alpha_referee_live_score_drafts) return old
        const drafts = Array.isArray(old.alpha_referee_live_score_drafts)
          ? old.alpha_referee_live_score_drafts
          : [old.alpha_referee_live_score_drafts]
        if (drafts.length === 0) return old
        return {
          ...old,
          alpha_referee_live_score_drafts: drafts.map((draft) =>
            draft.match_id === input.matchId
              ? { ...draft, quarter_boundaries: input.quarterBoundaries }
              : draft,
          ),
        }
      })
      return previous
    },
    onError: (_err, _input, previous) => {
      if (previous) queryClient.setQueryData(['match', matchId], previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}

export function useUpsertAlphaRefereeRunningDraft(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertAlphaRefereeRunningDraftInput) => upsertAlphaRefereeRunningDraft(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}

export function useRequestAlphaRefereeResultCorrection(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RequestAlphaRefereeResultCorrectionInput) =>
      requestAlphaRefereeResultCorrection(input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}

export function useSubmitRefereeMatchResult(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SubmitRefereeMatchResultInput) => submitRefereeMatchResult(input),
    // Fast-path both players: the referee's verdict flips the match to
    // 'submitted' (confirm/dispute pending) — peers should see it without
    // waiting on replication. No optimistic paint: the server owns results.
    onSuccess: () => {
      broadcastMatchLifecycleRealtimeChange({
        matchId,
        actorUserId: userId ?? '',
        kind: 'submitted',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
    },
  })
}
