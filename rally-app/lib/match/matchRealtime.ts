import { supabase } from '@/lib/supabase'
import {
  MATCH_LIFECYCLE_REALTIME_EVENT,
  type MatchLifecycleRealtimeKind,
  type MatchLifecycleRealtimePayload,
} from '@/lib/match/matchRealtimeEvents'

export const MATCH_STAKE_REALTIME_EVENT = 'stake-consent-changed'

export type MatchStakeRealtimeAction = 'accept' | 'unaccept' | 'stake_update'

export type MatchStakeRealtimePayload = {
  matchId: string
  actorUserId: string
  action: MatchStakeRealtimeAction
  acceptedAt?: string | null
  newStake?: number
  sentAt: string
}

export function isMatchStakeRealtimePayload(
  value: unknown,
  matchId: string,
): value is MatchStakeRealtimePayload {
  const payload = value as Partial<MatchStakeRealtimePayload> | null
  const baseValid = Boolean(
    payload &&
      payload.matchId === matchId &&
      typeof payload.actorUserId === 'string' &&
      typeof payload.sentAt === 'string' &&
      (
        payload.action === 'accept' ||
        payload.action === 'unaccept' ||
        payload.action === 'stake_update'
      ),
  )
  if (!baseValid || !payload) return false
  if (payload.action === 'accept') return typeof payload.acceptedAt === 'string'
  if (payload.action === 'unaccept') return payload.acceptedAt === null
  return typeof payload.newStake === 'number' && Number.isFinite(payload.newStake)
}

export function broadcastMatchStakeRealtimeChange(input: {
  matchId: string | undefined
  actorUserId: string
  action: MatchStakeRealtimeAction
  acceptedAt?: string | null
  newStake?: number
}): void {
  if (!input.matchId) return

  const topic = `match:${input.matchId}`
  const channel = supabase
    .getChannels()
    .find((candidate) => candidate.topic === `realtime:${topic}`)

  if (!channel) return

  void channel
    .send({
      type: 'broadcast',
      event: MATCH_STAKE_REALTIME_EVENT,
      payload: {
        matchId: input.matchId,
        actorUserId: input.actorUserId,
        action: input.action,
        acceptedAt: input.acceptedAt,
        newStake: input.newStake,
        sentAt: new Date().toISOString(),
      } satisfies MatchStakeRealtimePayload,
    })
    .catch(() => {
      // Postgres changes + the mutation's own invalidation are still the source of truth.
    })
}

// Lobby-lifecycle fast-path: nudge the other participants to refetch the match
// the instant a cancel/cancel-request/resolution happens, instead of waiting on
// Postgres replication lag. Fire-and-forget from the actor's onMutate or
// onSuccess — either works, but it MUST run while a screen mounting useMatch
// (the match channel) is still mounted, otherwise the send is silently
// skipped. The receiver confirms against the DB, so a dropped or spoofed
// broadcast is harmless. Postgres changes remain the truth.
export function broadcastMatchLifecycleRealtimeChange(input: {
  matchId: string | undefined
  actorUserId: string
  kind: MatchLifecycleRealtimeKind
}): void {
  if (!input.matchId) return

  const topic = `match:${input.matchId}`
  const channel = supabase
    .getChannels()
    .find((candidate) => candidate.topic === `realtime:${topic}`)

  if (!channel) return

  void channel
    .send({
      type: 'broadcast',
      event: MATCH_LIFECYCLE_REALTIME_EVENT,
      payload: {
        matchId: input.matchId,
        actorUserId: input.actorUserId,
        kind: input.kind,
        sentAt: new Date().toISOString(),
      } satisfies MatchLifecycleRealtimePayload,
    })
    .catch(() => {
      // Postgres changes + the mutation's own invalidation are still the source of truth.
    })
}
