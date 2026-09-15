import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitActivity } from '@/lib/activities/submission/submissionService'
import { notificationSummaryRootQueryKey } from '@/lib/notifications/notificationSummary'
import { broadcastMatchLifecycleRealtimeChange } from '@/lib/match/matchRealtime'
import type { SubmissionInput, TeamSportSubmissionData } from '@/lib/activities/submission/submissionTypes'
import type { MatchWithRelations, MatchStatus } from '@/types/match'

/**
 * Submit-side latency dominated the post-match feel: the user typed the
 * score, tapped Submit, then waited 600–1200 ms while the spinner ran
 * before any UI changed. Optimistic flip of match.status to 'submitted'
 * lets the confirm/dispute card surface immediately. The realtime
 * channel on match_submissions writes the canonical submission row
 * within ~100 ms.
 *
 * Snapshot/rollback uses the same shape as useMatchActions so the two
 * mutation hooks stay legible side-by-side.
 */
type Ctx = { prev: MatchWithRelations | undefined }

export function useSubmitActivity(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SubmissionInput) => submitActivity(input),
    onMutate: (input): Ctx => {
      const prev = queryClient.getQueryData<MatchWithRelations>(['match', matchId])
      if (!prev || prev.status === 'submitted' || prev.status === 'settled') {
        return { prev }
      }
      if (isTeamSportSubmission(input)) {
        return { prev }
      }
      queryClient.setQueryData<MatchWithRelations>(['match', matchId], (old) =>
        old ? { ...old, status: 'submitted' as MatchStatus } : old,
      )
      return { prev }
    },
    onSuccess: (result, input) => {
      // Refetch-hint so the opponent's confirm/dispute card appears without
      // waiting on replication — the receiver refetches the authoritative row.
      broadcastMatchLifecycleRealtimeChange({
        matchId,
        actorUserId: userId ?? result.teamResultSubmission?.submittedBy ?? '',
        kind: 'submitted',
      })
      if (!isTeamSportSubmission(input)) return
      const data = input.data as TeamSportSubmissionData
      queryClient.setQueryData<MatchWithRelations>(['match', matchId], (old) => {
        if (!old) return old
        const teamSubmission = result.teamResultSubmission
        const existing = old.match_team_result_submissions ?? []
        const nextTeamSubmissions = teamSubmission
          ? [
            ...existing.filter((submission) => submission.side_index !== teamSubmission.sideIndex),
            {
              id: teamSubmission.id,
              side_index: teamSubmission.sideIndex,
              submitted_by: teamSubmission.submittedBy,
              team_score: teamSubmission.teamScore,
              notes: input.notes ?? null,
              proof_urls: input.mediaPaths ?? [],
              accepted_by: null,
              accepted_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
          : existing

        return {
          ...old,
          status: 'in_progress',
          match_team_result_submissions: nextTeamSubmissions.length > 0
            ? nextTeamSubmissions
            : [
              ...existing.filter((submission) => submission.side_index !== data.side_index),
            ],
        }
      })
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['match', matchId], ctx.prev)
    },
    onSettled: () => {
      // Realtime channels on matches + match_submissions deliver the
      // canonical row; invalidate as a safety net so any field the
      // optimistic flip didn't touch (winner_user_id, submission row
      // metadata, activity_sessions join) gets the authoritative value.
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: notificationSummaryRootQueryKey })
      queryClient.invalidateQueries({ queryKey: ['activity-history'] })
    },
  })
}

function isTeamSportSubmission(input: SubmissionInput) {
  return input.activityType === 'basketball' || input.activityType === 'badminton'
}
