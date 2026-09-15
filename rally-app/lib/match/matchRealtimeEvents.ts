// Pure schema for the lobby-lifecycle broadcast fast-path. Kept free of the
// Supabase client so the receive-side type guard stays unit-testable; the
// actual `broadcast` sender lives in matchRealtime.ts (it needs the client).
//
// A lifecycle broadcast is only a "refetch now" hint — never trusted as truth.
// The receiver re-reads the match from the DB (RLS-protected), so a spoofed
// event can at worst cause a harmless extra refetch, never a forced dismiss.

export const MATCH_LIFECYCLE_REALTIME_EVENT = 'match-lifecycle-changed'

export type MatchLifecycleRealtimeKind =
  | 'cancelled'
  | 'cancel_requested'
  | 'cancel_resolved'
  | 'started'
  | 'settled'
  | 'disputed'
  | 'joined'
  | 'left'
  | 'invited'
  | 'invite_declined'
  | 'position_changed'
  | 'submitted'

export type MatchLifecycleRealtimePayload = {
  matchId: string
  actorUserId: string
  kind: MatchLifecycleRealtimeKind
  sentAt: string
}

const LIFECYCLE_KINDS: ReadonlySet<string> = new Set<MatchLifecycleRealtimeKind>([
  'cancelled',
  'cancel_requested',
  'cancel_resolved',
  'started',
  'settled',
  'disputed',
  'joined',
  'left',
  'invited',
  'invite_declined',
  'position_changed',
  'submitted',
])

export function isMatchLifecycleRealtimePayload(
  value: unknown,
  matchId: string,
): value is MatchLifecycleRealtimePayload {
  const payload = value as Partial<MatchLifecycleRealtimePayload> | null
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      payload.matchId === matchId &&
      typeof payload.actorUserId === 'string' &&
      typeof payload.sentAt === 'string' &&
      typeof payload.kind === 'string' &&
      LIFECYCLE_KINDS.has(payload.kind),
  )
}
