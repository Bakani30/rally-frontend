import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { supabase } from '@/lib/supabase'
import type { ArenaEvent } from '@/types/arena'
import type {
  ArenaSessionActionInput,
  ArenaSessionActionOutput,
  ArenaSessionMembershipCandidate,
  ArenaSessionSnapshot,
  ArenaTeamParticipationActionResult,
  ArenaTeamParticipationDecisionInput,
  ArenaTeamParticipationSnapshot,
} from '@/types/arenaSession'

type ArenaDetailOutput = { arena: ArenaEvent | null }

type MembershipCandidateRow = {
  arena_id: string
  arena_team_id: string
  user_id: string
  accepted_at: string | null
  is_active: boolean
  created_at: string
}

export async function getArenaSessionSnapshot(
  arenaEventId: string,
): Promise<ArenaSessionSnapshot> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaSessionSnapshot>(
    `arena-sessions?arenaEventId=${encodeURIComponent(arenaEventId)}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena Session')
  if (!data?.session) throw new Error('arena-sessions returned no snapshot')
  const teamParticipation = parseArenaTeamParticipationSnapshot(data.teamParticipation)
  if (!teamParticipation) {
    throw new Error('arena-sessions returned an invalid team participation snapshot')
  }
  return { ...data, teamParticipation }
}

export async function chooseArenaTeamParticipation(
  input: ArenaTeamParticipationDecisionInput,
): Promise<ArenaTeamParticipationActionResult> {
  const { data, error } = await invokeAuthenticatedFunction<unknown>('arena-events', {
    body: {
      action: 'choose_team_participation',
      sessionId: input.arenaId,
      participationCycleId: input.participationCycleId,
      expectedRevision: input.expectedRevision,
      decision: input.decision,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Arena team participation action failed')
  const output = parseArenaTeamParticipationActionResult(data)
  if (
    !output
    || output.arenaId !== input.arenaId
    || output.result.participationCycleId !== input.participationCycleId
    || output.result.decision !== input.decision
  ) {
    throw new Error('arena-events returned an invalid team participation result')
  }
  return output
}

export async function getArenaSessionEvent(arenaId: string): Promise<ArenaEvent | null> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaDetailOutput>(
    `arena-events?arenaId=${encodeURIComponent(arenaId)}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena Session')
  return data?.arena ?? null
}

export async function listOwnArenaSessionMembershipCandidates(
  userId: string,
): Promise<ArenaSessionMembershipCandidate[]> {
  // RLS is authoritative: the authenticated actor can read only memberships
  // visible to that actor. The user id narrows the actor-scoped result set.
  const { data, error } = await supabase
    .from('arena_team_members')
    .select('arena_id, arena_team_id, user_id, accepted_at, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as MembershipCandidateRow[]).map((row) => ({
    arenaId: row.arena_id,
    arenaTeamId: row.arena_team_id,
    userId: row.user_id,
    acceptedAt: row.accepted_at,
    isActive: row.is_active,
  }))
}

export async function invokeArenaSessionAction(
  input: ArenaSessionActionInput,
): Promise<ArenaSessionActionOutput> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaSessionActionOutput>(
    'arena-sessions',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Arena Session action failed')
  if (!data?.resourceId) throw new Error('arena-sessions returned no resourceId')
  return data
}

function parseArenaTeamParticipationSnapshot(value: unknown): ArenaTeamParticipationSnapshot | null {
  if (!isRecord(value)) return null
  if (hasExactKeys(value, ['blocksPairing'])) {
    return typeof value.blocksPairing === 'boolean' ? { blocksPairing: value.blocksPairing } : null
  }
  if (!hasExactKeys(value, [
    'participationCycleId',
    'teamId',
    'lane',
    'state',
    'revision',
    'queuePosition',
    'blocksPairing',
    'capabilities',
  ])) return null
  if (
    typeof value.participationCycleId !== 'string'
    || typeof value.teamId !== 'string'
    || (value.lane !== 'champion' && value.lane !== 'queue')
    || !isParticipationState(value.state)
    || !isPositiveInteger(value.revision)
    || (value.queuePosition !== null && !isPositiveInteger(value.queuePosition))
    || typeof value.blocksPairing !== 'boolean'
    || !isParticipationCapabilities(value.capabilities)
  ) return null
  return {
    participationCycleId: value.participationCycleId,
    teamId: value.teamId,
    lane: value.lane,
    state: value.state,
    revision: value.revision,
    queuePosition: value.queuePosition,
    blocksPairing: value.blocksPairing,
    capabilities: value.capabilities,
  }
}

function parseArenaTeamParticipationActionResult(
  value: unknown,
): ArenaTeamParticipationActionResult | null {
  if (!isRecord(value) || !hasExactKeys(value, ['arenaId', 'result']) || typeof value.arenaId !== 'string') {
    return null
  }
  const result = value.result
  if (!isRecord(result) || !hasExactKeys(result, [
    'participationCycleId',
    'teamId',
    'state',
    'revision',
    'decision',
    'idempotent',
  ])) return null
  if (
    typeof result.participationCycleId !== 'string'
    || typeof result.teamId !== 'string'
    || !isParticipationState(result.state)
    || !isPositiveInteger(result.revision)
    || (result.decision !== 'continue' && result.decision !== 'retire')
    || typeof result.idempotent !== 'boolean'
  ) return null
  return {
    arenaId: value.arenaId,
    result: {
      participationCycleId: result.participationCycleId,
      teamId: result.teamId,
      state: result.state,
      revision: result.revision,
      decision: result.decision,
      idempotent: result.idempotent,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index])
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isParticipationState(value: unknown): value is ArenaTeamParticipationActionResult['result']['state'] {
  return value === 'decision_required'
    || value === 'ready_to_pair'
    || value === 'paired'
    || value === 'retired'
}

function isParticipationCapabilities(
  value: unknown,
): value is { canContinue: boolean; canRetire: boolean } {
  return isRecord(value)
    && hasExactKeys(value, ['canContinue', 'canRetire'])
    && typeof value.canContinue === 'boolean'
    && typeof value.canRetire === 'boolean'
}
