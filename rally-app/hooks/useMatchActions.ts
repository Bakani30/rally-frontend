import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tierEventQueryKeys } from '@/hooks/useTierEvents'
import {
  broadcastMatchLifecycleRealtimeChange,
  broadcastMatchStakeRealtimeChange,
} from '@/lib/match/matchRealtime'
import {
  acceptTeamResult,
  acceptMatch,
  agreeResultCorrection,
  agreeTeamResultCorrection,
  cancelInvite,
  cancelMatch,
  challengeTeamResult,
  confirmMatchResult,
  declineResultCorrection,
  declineTeamResultCorrection,
  disputeMatchResult,
  finishCoopRun,
  inviteParticipant,
  joinMatch,
  kickMatchParticipant,
  leaveMatch,
  reportResultNotConfirmed,
  requestMutualCancel,
  requestResultCorrection,
  requestTeamResultCorrection,
  respondToInvite,
  respondToMutualCancel,
  startMatch,
  unacceptMatch,
  updateLobbyPosition,
  updateParticipantStake,
} from '@/lib/match/matchService'
import { getCurrentMatchSubmission } from '@/lib/match/matchSubmissions'
import { notificationSummaryRootQueryKey } from '@/lib/notifications/notificationSummary'
import type { WalletSummary } from '@/lib/wallet/walletService'
import {
  applyOptimisticPointBalanceDeltaToWalletSummary,
  forgetPendingOptimisticLockedDelta,
  type PendingOptimisticLockedDeltaToken,
  rememberPendingOptimisticLockedDelta,
} from '@/lib/wallet/pointBalanceRealtime'
import type { MatchWithRelations, ProposedResultPayload, Side } from '@/types/match'

/**
 * Helpers for the optimistic-update pattern used by every mutation in
 * this hook. Each mutation snapshots the current ['match', matchId] cache
 * before mutating, returns it as the mutation context, and rolls back on
 * error. onSettled finally invalidates the canonical cache so the
 * realtime channel's truth wins.
 */
type MatchSnapshot = {
  prev: MatchWithRelations | undefined
  walletUserId?: string
  prevWallet?: WalletSummary
  pendingLockedToken?: PendingOptimisticLockedDeltaToken
}

export function useMatchActions(matchId: string | undefined) {
  const queryClient = useQueryClient()

  function invalidateMatch() {
    queryClient.invalidateQueries({ queryKey: ['match', matchId] })
    queryClient.invalidateQueries({ queryKey: ['my-matches'] })
    queryClient.invalidateQueries({ queryKey: notificationSummaryRootQueryKey })
  }

  function snapshotMatch(
    userId?: string,
    pendingLockedToken?: PendingOptimisticLockedDeltaToken,
  ): MatchSnapshot {
    return {
      prev: queryClient.getQueryData<MatchWithRelations>(['match', matchId]),
      walletUserId: userId,
      prevWallet: userId ? queryClient.getQueryData<WalletSummary>(['wallet-summary', userId]) : undefined,
      pendingLockedToken,
    }
  }

  function mutateMatch(
    updater: (m: MatchWithRelations) => MatchWithRelations,
  ): void {
    queryClient.setQueryData<MatchWithRelations>(['match', matchId], (old) =>
      old ? updater(old) : old,
    )
  }

  function rollbackMatch(ctx: MatchSnapshot | undefined): void {
    if (ctx?.prev) queryClient.setQueryData(['match', matchId], ctx.prev)
    if (ctx?.walletUserId) {
      queryClient.setQueryData(['wallet-summary', ctx.walletUserId], ctx.prevWallet)
    }
    forgetPendingOptimisticLockedDelta(ctx?.pendingLockedToken)
  }

  function invalidateSettlementData() {
    invalidateMatch()
    queryClient.invalidateQueries({ queryKey: ['profile'] })
    queryClient.invalidateQueries({ queryKey: ['wallet-summary'] })
    queryClient.invalidateQueries({ queryKey: ['public-credits'] })
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    // Settlement can change a user's tier (promotion/demotion) — refetch
    // activity-ratings so the Locker's rank-frame cells reflect the new
    // tier instead of staying on the pre-settlement cache. Prefix-match
    // (no userId segment) so it hits whichever user's query is mounted.
    queryClient.invalidateQueries({ queryKey: ['activity-ratings'] })
    // Settlement can mint a tier_events row (promotion/demotion) — refetch
    // the unseen-events query so a promotion right after settle isn't
    // silently missed for the session (fixed 30s staleTime, gate mounted
    // once in _layout). Prefix-match (no userId segment).
    queryClient.invalidateQueries({ queryKey: tierEventQueryKeys.unseenPrefix })
  }

  const startMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => startMatch(input),
    onMutate: (input) => {
      const stakeToLock = getUserLeaderboardStake(input.match, input.userId)
      const pendingLockedToken = stakeToLock > 0
        ? rememberPendingOptimisticLockedDelta(input.userId, stakeToLock)
        : undefined
      const ctx = snapshotMatch(input.userId, pendingLockedToken)
      mutateMatch((m) => ({
        ...m,
        status: 'in_progress',
        started_at: m.started_at ?? new Date().toISOString(),
      }))
      if (stakeToLock > 0) {
        queryClient.setQueryData<WalletSummary | undefined>(
          ['wallet-summary', input.userId],
          (current) => applyOptimisticPointBalanceDeltaToWalletSummary(current, {
            lockedDelta: stakeToLock,
          }),
        )
      }
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    onSuccess: (data, input) => {
      // Pin the authoritative server result so the screen flips to the live
      // (in_progress) scoring view immediately, even if a refetch lands stale.
      if (data) {
        mutateMatch((m) => ({ ...m, status: data.matchStatus, started_at: data.startedAt }))
      }
      // Fast-path the OTHER side: without this hint the peer only learns the
      // match started via Postgres replication of the matches row (200-500 ms).
      // The broadcast nudges an immediate refetch the moment start commits.
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'started' })
    },
    onSettled: (_data, _err, input) => {
      invalidateMatch()
      queryClient.invalidateQueries({ queryKey: ['wallet-summary', input.userId] })
    },
  })

  // Joining a team is the highest-priority interaction in the app — the
  // user wants to be in the room the instant they tap. Optimistic insert
  // of a synthetic participant row makes the side-card update with their
  // YOU tag immediately. The match_participants realtime channel
  // (subscribed in useMatch) will replace the synthetic row with the
  // canonical one ~100 ms later.
  const joinMutation = useMutation({
    mutationFn: (input: { userId: string; side: Side; stake: number; entryCode?: string }) =>
      joinMatch({ matchId: matchId!, side: input.side, stake: input.stake, entryCode: input.entryCode }),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      mutateMatch((m) => {
        // Dedup: if realtime already raced ahead and inserted the
        // canonical participant row, leave it alone — duplicate keys
        // would warn in dev and double-count the side pot until refetch.
        if (m.match_participants.some((p) => p.user_id === input.userId)) {
          return m
        }
        // accepted_at stays null: server inserts the participant row with
        // accepted_at=NULL on join. The user must tap "accept stake"
        // separately. Painting a synthetic timestamp here would flip the
        // Start-button gating and green checkmark before the server has
        // recorded acceptance.
        return {
          ...m,
          match_participants: [
            ...m.match_participants,
            {
              user_id: input.userId,
              side: input.side,
              stake_contribution: input.stake,
              accepted_at: null,
              is_active: true,
              rating_before: null,
              rating_after: null,
              users: null,
            },
          ],
        }
      })
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the people already in the lobby: the joiner is mounted on the
    // match channel (they joined from the match-detail screen), so a lifecycle
    // hint nudges everyone else to refetch and see the new participant the
    // instant the join commits, instead of waiting on match_participants
    // replication lag.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'joined' })
    },
    // Realtime channel (postgres_changes on match_participants filtered
    // by match_id) will deliver the canonical row, so explicit
    // invalidation is redundant. We still invalidate the my-matches
    // list because it's keyed by user, not by match, and the open
    // channel there filters on user_id=eq.{userId} which fires too.
    // Skipping the match-detail invalidate here is what cuts ~300 ms
    // of post-join refetch the user used to see as a brief flicker.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
    },
  })

  // Confirm — opponent agrees with the submitted score. Server runs the
  // settlement RPC (lock stakes → distribute pot → mark settled). The
  // user-facing point gain/loss must feel instantaneous, so we flip the
  // status + winner client-side and let the canonical settlement row
  // overwrite via realtime (~100 ms later).
  const confirmMutation = useMutation({
    mutationFn: (match: MatchWithRelations) => confirmMatchResult(match),
    onMutate: (match) => {
      const ctx = snapshotMatch()
      // Predict the winner from the submitted scores. The server confirms
      // against the latest submission by created_at; mirror that result
      // when present, otherwise leave winner null and let the server fill it.
      const submission = getCurrentMatchSubmission(match)
      const winnerId = submission?.winner_user_id ?? null
      mutateMatch((m) => ({
        ...m,
        status: 'settled',
        winner_user_id: winnerId,
        is_tie: winnerId === null,
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the peer: settlement flips the matches row to 'settled', but
    // the opponent otherwise waits on Postgres replication to see the match
    // end. The broadcast triggers an immediate authoritative refetch. The
    // payload is never trusted, so using created_by as the actor id is safe.
    onSuccess: (_data, match) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: match.created_by, kind: 'settled' })
    },
    // Wallet/leaderboard/profile invalidations live in onSettled so the
    // server's authoritative numbers replace the optimistic prediction.
    onSettled: invalidateSettlementData,
  })

  const acceptTeamResultMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => acceptTeamResult(input.match),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      const me = input.match.match_participants.find((p) => p.user_id === input.userId)
      const now = new Date().toISOString()
      mutateMatch((m) => ({
        ...m,
        match_team_result_submissions: (m.match_team_result_submissions ?? []).map((submission) =>
          submission.side_index === me?.side
            ? { ...submission, accepted_by: input.userId, accepted_at: now }
            : submission,
        ),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the peer: accepting the team result can settle the match, so
    // nudge the other side to refetch immediately instead of waiting on
    // replication. Receiver re-reads the authoritative row regardless of kind.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'settled' })
    },
    onSettled: invalidateSettlementData,
  })

  // Dispute — opponent rejects the submitted score. Status flip is the
  // only client-visible change; the dispute card surfaces immediately.
  const disputeMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => disputeMatchResult(input),
    onMutate: () => {
      const ctx = snapshotMatch()
      mutateMatch((m) => ({ ...m, status: 'disputed' }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the peer so the dispute card surfaces on the other side without
    // waiting on Postgres replication of the status flip.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'disputed' })
    },
    onSettled: invalidateMatch,
  })

  // Host cancels a pending match. We do NOT optimistically flip status to
  // 'cancelled': that drove the screen's auto-dismiss effect before the server
  // confirmed, so a rejected cancel (e.g. the match was just accepted) still
  // bounced the host out of a lobby that was actually still live. The host's
  // own dismiss is owned by the caller's onSuccess (exitToHome), which only
  // runs once the cancel is committed. The lifecycle hint fires in onSuccess —
  // after commit — so the other side's refetch actually observes 'cancelled'
  // (firing it in onMutate raced ahead of the write, making the hint useless).
  const cancelMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => cancelMatch(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancelled' })
      invalidateMatch()
    },
  })

  // Broadcast the refetch hint in onSuccess (after the write commits) so the
  // other side's refetch observes the new cancel-request state — firing it in
  // onMutate raced ahead of the commit, so the hint landed on stale data.
  const requestMutualCancelMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => requestMutualCancel(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_requested' })
      invalidateMatch()
    },
  })

  const respondToMutualCancelMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string; agree: boolean }) =>
      respondToMutualCancel(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_resolved' })
      invalidateSettlementData()
    },
  })

  // Broadcast the refetch hint in onSuccess (after the write commits) so peers
  // observe the new correction-request state. Reuses existing lifecycle kinds —
  // 'cancel_requested' signals a pending request; 'cancel_resolved' signals
  // agree/decline resolution. Both drive a spoof-safe refetch on the receiver.
  const requestResultCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string; proposed: ProposedResultPayload }) =>
      requestResultCorrection(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_requested' })
      invalidateMatch()
    },
  })

  const agreeResultCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => agreeResultCorrection(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_resolved' })
      invalidateSettlementData()
    },
  })

  const declineResultCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => declineResultCorrection(input),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_resolved' })
      invalidateMatch()
    },
  })

  // Broadcast the refetch hint in onSuccess (after the write commits) so the
  // other side's refetch observes the new team correction-request state.
  // Reuses existing lifecycle kinds — 'cancel_requested' signals a pending
  // request; 'cancel_resolved' signals agree/decline resolution. Both drive a
  // spoof-safe refetch on the receiver; no new kind needed.
  const requestTeamCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) =>
      requestTeamResultCorrection(input.match.id),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_requested' })
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
    },
  })

  const agreeTeamCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) =>
      agreeTeamResultCorrection(input.match.id),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_resolved' })
      invalidateSettlementData()
    },
  })

  const declineTeamCorrectionMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) =>
      declineTeamResultCorrection(input.match.id),
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'cancel_resolved' })
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => leaveMatch(input),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      if (input.match.status === 'pending') {
        mutateMatch((m) => ({
          ...m,
          match_participants: m.match_participants.filter((p) => p.user_id !== input.userId),
        }))
      } else {
        mutateMatch((m) => ({
          ...m,
          match_participants: m.match_participants.map((p) =>
            p.user_id === input.userId ? { ...p, is_active: false } : p
          ),
        }))
      }
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the rest of the lobby so the leaver disappears immediately
    // instead of waiting on match_participants replication.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'left' })
    },
    onSettled: invalidateMatch,
  })

  const finishCoopRunMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => finishCoopRun(input),
    // Fast-path the peer so the coop run's settled state lands immediately
    // instead of waiting on replication.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.userId, kind: 'settled' })
    },
    onSettled: invalidateSettlementData,
  })

  const kickParticipantMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; hostUserId: string; targetUserId: string }) =>
      kickMatchParticipant(input),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      mutateMatch((m) => ({
        ...m,
        status: m.status === 'accepted' ? 'pending' : m.status,
        accepted_at: m.status === 'accepted' ? null : m.accepted_at,
        match_participants: m.match_participants.filter((p) => p.user_id !== input.targetUserId),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path the lobby (including the kicked player) so the removal lands
    // immediately instead of waiting on replication.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({ matchId, actorUserId: input.targetUserId, kind: 'left' })
    },
    onSettled: invalidateSettlementData,
  })

  const reportResultMutation = useMutation({
    mutationFn: (input: {
      match: MatchWithRelations
      reporterUserId: string
      reportedUserId: string | null
      note?: string | null
      evidencePaths?: string[]
    }) => reportResultNotConfirmed(input),
    onSuccess: invalidateMatch,
  })

  const challengeTeamResultMutation = useMutation({
    mutationFn: (input: {
      match: MatchWithRelations
      reporterUserId: string
      reportedUserId: string | null
      note?: string | null
      evidencePaths?: string[]
    }) => challengeTeamResult(input),
    onSuccess: (reportId, input) => {
      mutateMatch((m) => ({
        ...m,
        match_abuse_reports: [
          ...(m.match_abuse_reports ?? []).filter((report) => report.id !== reportId),
          {
            id: reportId,
            match_id: input.match.id,
            reporter_user_id: input.reporterUserId,
            reported_user_id: input.reportedUserId,
            reason: 'team_result_incorrect' as const,
            note: input.note ?? null,
            evidence_paths: input.evidencePaths ?? [],
            status: 'open' as const,
            created_at: new Date().toISOString(),
          },
        ],
      }))
      invalidateMatch()
    },
  })

  const updateParticipantStakeMutation = useMutation({
    mutationFn: (input: {
      match: MatchWithRelations
      userId: string
      newStake: number
    }) => updateParticipantStake(input),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      mutateMatch((m) => ({
        ...m,
        match_participants: m.match_participants.map((participant) => ({
          ...participant,
          stake_contribution: participant.user_id === input.userId
            ? input.newStake
            : participant.stake_contribution,
          accepted_at: null,
        })),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Broadcast the peer refetch-hint only after the write commits (in onMutate
    // it raced ahead of the DB and could nudge peers to refetch stale rows).
    onSuccess: (_data, input) => {
      broadcastMatchStakeRealtimeChange({
        matchId,
        actorUserId: input.userId,
        action: 'stake_update',
        newStake: input.newStake,
      })
    },
    onSettled: invalidateMatch,
  })

  const updateLobbyPositionMutation = useMutation({
    mutationFn: (input: {
      match: MatchWithRelations
      userId: string
      side: Side
      positionKey: string
    }) => updateLobbyPosition(input),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      mutateMatch((m) => {
        const sideChanged = m.match_participants.some((participant) =>
          participant.user_id === input.userId && participant.side !== input.side,
        )
        return {
          ...m,
          accepted_at: sideChanged ? null : m.accepted_at,
          match_participants: m.match_participants.map((participant) =>
            participant.user_id === input.userId
              ? {
                  ...participant,
                  side: input.side,
                  lobby_position_key: input.positionKey,
                  accepted_at: sideChanged ? null : participant.accepted_at,
                }
              : sideChanged
                ? { ...participant, accepted_at: null }
                : participant,
          ),
        }
      })
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Refetch-hint to peers after the position write commits — a side change
    // resets everyone's accepted_at, so peers must see the consent reset fast.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({
        matchId,
        actorUserId: input.userId,
        kind: 'position_changed',
      })
    },
    onSettled: invalidateMatch,
  })

  // Sending an invite — host taps a friend in the picker. Optimistic
  // insert of a synthetic match_invites row so the "รอตอบรับ" pending
  // card appears in the side card immediately. The match_invites
  // realtime channel replaces it with the canonical row when the RPC
  // returns. Rolls back if the RPC rejects (e.g. side full).
  const inviteMutation = useMutation({
    mutationFn: (input: {
      userId: string
      side: Side
      stake: number
      handle?: string | null
      displayName?: string | null
    }) =>
      inviteParticipant({ matchId: matchId!, userId: input.userId, side: input.side, stake: input.stake }),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      const nowIso = new Date().toISOString()
      const tempId = `optimistic-${input.userId}-${Date.now()}`
      mutateMatch((m) => {
        const invites = m.match_invites ?? []
        // Dedup: realtime may have raced ahead, or the host double-tapped
        // the picker. Skip if a pending invite for this user already
        // exists on the cached match.
        if (
          invites.some(
            (inv) => inv.invitee_user_id === input.userId && inv.status === 'pending',
          )
        ) {
          return m
        }
        return {
        ...m,
        match_invites: [
          ...invites,
          {
            id: tempId,
            match_id: m.id,
            invitee_user_id: input.userId,
            inviter_user_id: m.created_by,
            side: input.side,
            status: 'pending',
            sent_at: nowIso,
            responded_at: null,
            invitee: {
              id: input.userId,
              display_name: input.displayName ?? null,
              // We don't have the invitee's email at this surface; the
              // realtime row will fill it in within ~100 ms. ParticipantUser
              // requires a string so we use an empty placeholder.
              email: '',
              handle: input.handle ?? null,
              avatar_url: null,
              jersey_number: null,
              leaderboard_score: null,
            },
          },
        ],
        }
      })
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Nudge co-participants already in the lobby so the pending-invite card
    // shows up for them as fast as it does for the host.
    onSuccess: (_data, input) => {
      broadcastMatchLifecycleRealtimeChange({
        matchId,
        actorUserId: input.userId,
        kind: 'invited',
      })
    },
    onSettled: invalidateMatch,
  })

  // Accept stake — host or participant flips own accepted_at to "now". The
  // realtime channel will re-broadcast the canonical timestamp; until then
  // we paint a synthetic now() so the green checkmark and Start button
  // gating both flip the moment the user taps.
  const acceptMutation = useMutation({
    mutationFn: (input: { userId: string }) =>
      acceptMatch(matchId!).then(() => input),
    onMutate: (input) => {
      const ctx = snapshotMatch()
      const nowIso = new Date().toISOString()
      mutateMatch((m) => ({
        ...m,
        match_participants: m.match_participants.map((p) =>
          p.user_id === input.userId ? { ...p, accepted_at: p.accepted_at ?? nowIso } : p,
        ),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Refetch-hint to peers only after the accept commits (the receiver ignores
    // the payload and refetches, so the timestamp is just a freshness marker).
    onSuccess: (_data, input) => {
      broadcastMatchStakeRealtimeChange({
        matchId,
        actorUserId: input.userId,
        action: 'accept',
        acceptedAt: new Date().toISOString(),
      })
    },
    onSettled: invalidateMatch,
  })

  // Host kick — drop the pending invite from the cached array immediately.
  // The card disappears with no flicker and the slot opens for re-invite.
  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) => {
      // Guard the race between optimistic invite insert and realtime
      // delivery of the canonical row. The optimistic placeholder uses a
      // synthetic id (`optimistic-${userId}-${ts}`) which Postgres would
      // reject as a uuid. Force a refetch and surface a retry hint
      // instead of sending the synthetic id downstream.
      if (inviteId.startsWith('optimistic-')) {
        invalidateMatch()
        throw new Error('กำลังสร้างคำเชิญ ลองอีกครั้ง')
      }
      return cancelInvite(inviteId)
    },
    onMutate: (inviteId) => {
      const ctx = snapshotMatch()
      mutateMatch((m) => ({
        ...m,
        match_invites: (m.match_invites ?? []).filter((i) => i.id !== inviteId),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    onSettled: invalidateMatch,
  })

  // Unaccept — flip own accepted_at back to null. When the room had already
  // reached 'accepted' (everyone ready, stakes locked), revoking reverts the
  // whole room to 'pending' and releases the locks server-side; mirror that flip
  // optimistically so the lobby re-opens the instant the user taps.
  const unacceptMutation = useMutation({
    mutationFn: (input: { match: MatchWithRelations; userId: string }) => unacceptMatch(input),
    onMutate: (input) => {
      const ctx = snapshotMatch(input.userId)
      mutateMatch((m) => ({
        ...m,
        status: m.status === 'accepted' ? 'pending' : m.status,
        accepted_at: m.status === 'accepted' ? null : m.accepted_at,
        match_participants: m.match_participants.map((p) =>
          p.user_id === input.userId ? { ...p, accepted_at: null } : p,
        ),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Refetch-hint to peers only after the unaccept commits.
    onSuccess: (_data, input) => {
      broadcastMatchStakeRealtimeChange({
        matchId,
        actorUserId: input.userId,
        action: 'unaccept',
        acceptedAt: null,
      })
    },
    // Reverting from 'accepted' unlocks every participant's stake, so refresh the
    // wallet to drop the locked amount back to spendable.
    onSettled: (_data, _err, input) => {
      invalidateMatch()
      queryClient.invalidateQueries({ queryKey: ['wallet-summary', input.userId] })
    },
  })

  // Invite response (from match-detail screen on the invitee's side). Only
  // optimistic for the decline case — accept inserts a participant row and
  // it's safer to wait for the server roundtrip than fabricate one.
  const respondInviteMutation = useMutation({
    mutationFn: (input: {
      match: MatchWithRelations
      inviteId: string
      action: 'accept' | 'decline'
      stake?: number
    }) => respondToInvite(input),
    onMutate: (input) => {
      if (input.action !== 'decline') return undefined
      const ctx = snapshotMatch()
      mutateMatch((m) => ({
        ...m,
        match_invites: (m.match_invites ?? []).filter((i) => i.id !== input.inviteId),
      }))
      return ctx
    },
    onError: (_err, _input, ctx) => rollbackMatch(ctx),
    // Fast-path both answers: accept inserts a participant row, decline frees
    // the slot — the host should see either outcome immediately instead of
    // waiting on replication.
    onSuccess: (_data, input) => {
      const invitee = (input.match.match_invites ?? []).find((i) => i.id === input.inviteId)?.invitee_user_id
      broadcastMatchLifecycleRealtimeChange({
        matchId,
        actorUserId: invitee ?? input.match.created_by,
        kind: input.action === 'accept' ? 'joined' : 'invite_declined',
      })
    },
    onSettled: invalidateMatch,
  })

  return {
    startMutation,
    joinMutation,
    confirmMutation,
    acceptTeamResultMutation,
    disputeMutation,
    cancelMutation,
    requestMutualCancelMutation,
    respondToMutualCancelMutation,
    requestResultCorrectionMutation,
    agreeResultCorrectionMutation,
    declineResultCorrectionMutation,
    requestTeamCorrectionMutation,
    agreeTeamCorrectionMutation,
    declineTeamCorrectionMutation,
    leaveMutation,
    finishCoopRunMutation,
    kickParticipantMutation,
    reportResultMutation,
    challengeTeamResultMutation,
    updateParticipantStakeMutation,
    updateLobbyPositionMutation,
    inviteMutation,
    respondInviteMutation,
    acceptMutation,
    unacceptMutation,
    cancelInviteMutation,
  }
}

function getUserLeaderboardStake(match: MatchWithRelations, userId: string): number {
  if (match.stake_currency !== 'leaderboard_point') return 0
  const participant = match.match_participants.find((item) => item.user_id === userId)
  const stake = participant?.stake_contribution ?? match.stake
  return Number.isFinite(stake) ? Math.max(0, stake) : 0
}
