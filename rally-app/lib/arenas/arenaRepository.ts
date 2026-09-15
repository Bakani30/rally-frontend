import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { ArenaActionOutput, ArenaCreateInput, ArenaEvent, ArenaTeamCreateInput } from '@/types/arena'
import type { ArenaEventActionInput } from '@/types/arenaSession'

type ArenaListOutput = { arenas: ArenaEvent[] }
type ArenaDetailOutput = { arena: ArenaEvent | null }

export async function listArenaEvents(): Promise<ArenaEvent[]> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaListOutput>('arena-events', {
    method: 'GET',
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arenas')
  return data?.arenas ?? []
}

export async function getArenaEvent(arenaId: string): Promise<ArenaEvent | null> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaDetailOutput>(
    `arena-events?arenaId=${encodeURIComponent(arenaId)}`,
    { method: 'GET' },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena')
  return data?.arena ?? null
}

export async function createArenaEvent(input: ArenaCreateInput): Promise<ArenaActionOutput> {
  return invokeArenaAction({
    action: 'create_arena',
    title: input.title,
    activityType: input.activityType,
    teamSizePerSide: input.teamSizePerSide,
    joinMode: input.joinMode ?? 'open',
    entryCode: input.entryCode ?? null,
    ruleText: input.ruleText ?? null,
    targetScore: input.targetScore ?? null,
    timeLimitSeconds: input.timeLimitSeconds ?? null,
  })
}

export async function createArenaTeam(input: ArenaTeamCreateInput): Promise<ArenaActionOutput> {
  return invokeArenaAction({
    action: 'create_team',
    arenaId: input.arenaId,
    name: input.name,
    colorKey: input.colorKey ?? 'orange',
    iconKey: input.iconKey ?? 'shield',
    memberUserIds: input.memberUserIds ?? [],
  })
}

export async function addArenaTeamMember(input: { arenaTeamId: string; userId: string }): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'add_team_member', ...input })
}

export async function readyArenaTeamMember(arenaTeamId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'ready_member', arenaTeamId })
}

export async function joinArenaRefereePool(arenaId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'join_referee_pool', arenaId })
}

export async function assignArenaRoundReferee(input: {
  roundId: string
  refereeUserId: string | null
}): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'assign_referee', ...input })
}

export async function advanceArenaQueue(arenaId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'advance_queue', arenaId })
}

export async function reorderArenaSessionQueue(input: {
  arenaId: string
  expectedTeamIds: string[]
  orderedTeamIds: string[]
}): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'reorder_queue', ...input })
}

export async function acceptArenaRoundStake(roundId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'accept_round_stake', roundId })
}

export async function updateArenaRoundStakeProposal(
  input: ArenaEventActionPayload<'update_stake_proposal'>,
): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'update_stake_proposal', ...input })
}

export async function confirmArenaFinalStake(
  input: ArenaEventActionPayload<'confirm_final_stake'>,
): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'confirm_final_stake', ...input })
}

export async function startArenaRound(roundId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'start_round', roundId })
}

export async function startArenaSessionRound(
  input: ArenaEventActionPayload<'start_round'>,
): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'start_round', ...input })
}

export async function submitArenaRoundResult(input: {
  roundId: string
  championScore: number
  challengerScore: number
}): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'submit_result', ...input })
}

export async function disputeArenaRound(input: { roundId: string; reason: string }): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'dispute_round', ...input })
}

export async function finalizeArenaRound(input: { roundId: string; force?: boolean }): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'finalize_round', roundId: input.roundId, force: input.force ?? false })
}

export async function applyArenaStakeTimeout(roundId: string): Promise<ArenaActionOutput> {
  return invokeArenaAction({ action: 'apply_stake_timeout', roundId })
}

type ArenaEventActionPayload<TAction extends ArenaEventActionInput['action']> = Omit<
  Extract<ArenaEventActionInput, { action: TAction }>,
  'action'
>

async function invokeArenaAction(body: Record<string, unknown>): Promise<ArenaActionOutput> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaActionOutput>('arena-events', { body })
  if (error) throw await extractEdgeFunctionError(error, 'Arena action failed')
  if (!data?.arenaId) throw new Error('arena-events returned no arenaId')
  return data
}
