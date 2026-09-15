import type { ArenaEvent, ArenaTeam, ArenaTeamMember } from '@/types/arena'
import type {
  ArenaSessionActionOutput,
  ArenaSessionCanonicalTeamState,
  ArenaSessionMembershipCandidate,
  ArenaSessionResolverInput,
  ArenaSessionState,
  ArenaSessionBoardModel,
  ArenaSessionBoardStatus,
  ArenaRoundPhase,
  ArenaSessionSnapshot,
} from '@/types/arenaSession'
import type { CreateArenaSessionInput } from '@/types/arenaSession'
import type { PartyDetail } from '@/types/party'

const CANONICAL_TEAM_STATUSES = new Set<ArenaSessionCanonicalTeamState['status']>([
  'queued',
  'on_deck',
  'active',
  'champion',
  'disputed',
])

const BOARD_STATUS_HEADLINES: Record<ArenaSessionBoardStatus, string> = {
  forming: 'เลือกสมาชิกเข้าแข่งขัน',
  queued: 'อยู่ในคิว',
  on_deck: 'ถึงคิวแล้ว',
  active: 'กำลังแข่ง',
  champion: 'คุณอยู่บนสนาม',
  disputed: 'ผลการแข่งขันอยู่ระหว่างตรวจสอบ',
  draining: 'กำลังปิดสนาม',
  closed: 'สนามจบแล้ว',
  cancelled: 'สนามถูกยกเลิก',
  member_unavailable: 'สมาชิกไม่พร้อมใช้งาน',
}

export const ARENA_SESSION_RECONNECT_POLICY = {
  refetchSnapshot: true,
  recordPresence: false,
  ready: false,
} as const

type WithoutCreateIdempotencyKey<T> = T extends unknown
  ? Omit<T, 'idempotencyKey'>
  : never

export type ArenaSessionCreatePayload = WithoutCreateIdempotencyKey<CreateArenaSessionInput>

type ArenaSessionCreateRequest<T> = (input: CreateArenaSessionInput) => Promise<T>

type ActiveArenaSessionCreateAttempt = {
  payloadFingerprint: string
  idempotencyKey: string
  promise: Promise<unknown> | null
}

export class ArenaSessionCreateInFlightError extends Error {
  readonly code = 'arena_session_create_in_flight'

  constructor() {
    super('An Arena Session create request is already in progress.')
    this.name = 'ArenaSessionCreateInFlightError'
  }
}

export type ArenaSessionCreateNavigationPhase =
  | 'idle'
  | 'awaiting_location'
  | 'creating'
  | 'succeeded'

// React state alone cannot guard the short gap between a resolved mutation and
// Expo Router committing its replacement. This synchronous latch is the single
// source of truth for a screen-level create attempt; the screen mirrors its
// phase into state only to render a frozen form.
export function createArenaSessionCreateNavigationLatch() {
  let currentPhase: ArenaSessionCreateNavigationPhase = 'idle'

  return {
    begin(): boolean {
      if (currentPhase !== 'idle') return false
      currentPhase = 'awaiting_location'
      return true
    },
    claimTransport(): boolean {
      if (currentPhase !== 'awaiting_location') return false
      currentPhase = 'creating'
      return true
    },
    succeed(): boolean {
      if (currentPhase !== 'creating') return false
      currentPhase = 'succeeded'
      return true
    },
    fail(): boolean {
      if (currentPhase !== 'awaiting_location' && currentPhase !== 'creating') {
        return false
      }
      currentPhase = 'idle'
      return true
    },
    phase(): ArenaSessionCreateNavigationPhase {
      return currentPhase
    },
    isFrozen(): boolean {
      return currentPhase !== 'idle'
    },
  }
}

export function createArenaSessionCreateAttempt(createKey: () => string) {
  let activeAttempt: ActiveArenaSessionCreateAttempt | null = null

  return {
    execute<T>(
      payload: ArenaSessionCreatePayload,
      request: ArenaSessionCreateRequest<T>,
    ): Promise<T> {
      const payloadFingerprint = getArenaSessionCreatePayloadFingerprint(payload)

      if (activeAttempt?.promise) {
        if (activeAttempt.payloadFingerprint === payloadFingerprint) {
          return activeAttempt.promise as Promise<T>
        }
        return Promise.reject(new ArenaSessionCreateInFlightError())
      }

      if (!activeAttempt || activeAttempt.payloadFingerprint !== payloadFingerprint) {
        activeAttempt = {
          payloadFingerprint,
          idempotencyKey: createKey(),
          promise: null,
        }
      }

      const attempt = activeAttempt
      const requestInput = {
        ...payload,
        idempotencyKey: attempt.idempotencyKey,
      } as CreateArenaSessionInput
      const pending = Promise.resolve().then(() => request(requestInput))
      const settled = pending.then(
        (output) => {
          if (activeAttempt === attempt) activeAttempt = null
          return output
        },
        (error: unknown) => {
          if (activeAttempt === attempt) {
            if (isArenaSessionCreateIdempotencyConflict(error)) {
              activeAttempt = null
            } else {
              attempt.promise = null
            }
          }
          throw error
        },
      )

      attempt.promise = settled
      return settled
    },
  }
}

function getArenaSessionCreatePayloadFingerprint(payload: ArenaSessionCreatePayload): string {
  // The Edge schema trims these two fields before it computes the durable
  // request hash. Keep client retry identity aligned with that canonical form.
  const location = 'venueId' in payload && typeof payload.venueId === 'string'
    ? { venueId: payload.venueId }
    : { anchorLat: payload.anchorLat, anchorLng: payload.anchorLng }

  return JSON.stringify({
    title: payload.title.trim(),
    activityType: payload.activityType,
    teamSize: payload.teamSize,
    ruleText: payload.ruleText.trim(),
    targetScore: payload.targetScore,
    timeLimitSeconds: payload.timeLimitSeconds,
    joinMode: payload.joinMode,
    mode: payload.mode,
    location,
  })
}

function isArenaSessionCreateIdempotencyConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const source = error as { code?: unknown; message?: unknown }
  return source.code === 'arena_session_idempotency_conflict'
    || (typeof source.message === 'string'
      && source.message.includes('arena_session_idempotency_conflict'))
}

export function getActivePartyMemberIds(party?: PartyDetail | null): string[] {
  if (!party) return []
  const ids = party.party_members
    .filter((member) => member.status === 'active')
    .map((member) => member.user_id)
  return [...new Set(ids)].slice(0, 5)
}

export function canStagePartySelection(
  memberUserIds: string[],
  teamSize: number,
): boolean {
  return teamSize >= 1
    && teamSize <= 5
    && memberUserIds.length === teamSize
    && new Set(memberUserIds).size === teamSize
}

export function mapArenaSessionSnapshot(
  snapshot: ArenaSessionSnapshot,
  context: {
    actorUserId?: string
    party?: Pick<PartyDetail, 'host_user_id'> | null
  } = {},
): ArenaSessionBoardModel {
  const team = snapshot.actor.teamId
    ? snapshot.teams.find((candidate) => candidate.teamId === snapshot.actor.teamId) ?? null
    : null
  const status = resolveBoardStatus(snapshot, team)
  const isTerminal = snapshot.session.sessionState === 'closed'
    || snapshot.session.sessionState === 'cancelled'
  const isHost = snapshot.actor.role === 'host'
  const actorMemberState = snapshot.actor.memberState ?? null
  const isSelfRosterMember = Boolean(snapshot.actor.teamId)
    && actorMemberState !== null
    && actorMemberState !== 'left'
  const isServerLeft = actorMemberState === 'left'
  const legacyCanRecordPresence = !isTerminal
    && snapshot.session.sessionState !== 'draining'
    && !isServerLeft
    && (isSelfRosterMember || (isHost && snapshot.session.sourceKind === 'ad_hoc'))
    && snapshot.actor.presenceStatus !== 'valid'
  const canRecordPresence = snapshot.actor.canRecordPresence ?? legacyCanRecordPresence
  const canReady = !isTerminal
    && snapshot.session.sessionState === 'open'
    && Boolean(team)
    && team?.status === 'forming'
    && isSelfRosterMember
    && actorMemberState === 'staged'
    && snapshot.actor.presenceStatus === 'valid'
  const canLeave = !isTerminal
    && isSelfRosterMember
    && (team?.status === 'forming' || team?.status === 'queued')
  const isSelectedPartyHost = Boolean(context.actorUserId)
    && context.party?.host_user_id === context.actorUserId

  const legacyCanOpen = isHost
    && snapshot.session.mode === 'casual'
    && snapshot.session.sessionState === 'preparing'
    && (snapshot.session.sourceKind === 'venue' || snapshot.actor.presenceStatus === 'valid')
  const roundState = snapshot.actor.roundState ?? null
  const liveRound = snapshot.liveRound

  return {
    snapshot,
    status,
    actorRole: snapshot.actor.role,
    actorMemberState,
    presenceStatus: snapshot.actor.presenceStatus,
    canJoin: snapshot.actor.canJoin,
    canRecordPresence,
    canReady,
    canLeave,
    canStage: snapshot.session.sessionState === 'open'
      && isSelectedPartyHost,
    canOpen: snapshot.session.mode !== 'conquest' && (snapshot.actor.canOpen ?? legacyCanOpen),
    canBeginDrain: isHost && snapshot.session.sessionState === 'open',
    canClose: isHost
      && (snapshot.session.sessionState === 'open' || snapshot.session.sessionState === 'draining'),
    activeMatchId: snapshot.actor.activeMatchId ?? null,
    roundPhase: resolveRoundPhase(snapshot),
    roundId: liveRound?.roundId ?? null,
    roundState,
    stake: liveRound?.stake ?? null,
    canEditOwnStake: roundState?.capabilities.canEditOwnStake === true,
    canConfirmStake: roundState?.capabilities.canConfirmStake === true,
    canStartRound: roundState?.capabilities.canStartRound === true,
    // Capability authority is server-owned. Do not infer captain status or a
    // paired state from local team/round data.
    teamParticipation: snapshot.teamParticipation,
    drainDeadlineAt: snapshot.session.drainDeadlineAt,
    team,
    teams: snapshot.teams,
    rounds: snapshot.rounds,
  }
}

function resolveRoundPhase(snapshot: ArenaSessionSnapshot): ArenaRoundPhase {
  return snapshot.liveRound?.phase ?? 'queue'
}

export function getArenaSessionBoardPresentation(snapshot: ArenaSessionSnapshot): {
  headline: string
  status: ArenaSessionBoardStatus
  detail: string
} {
  const view = mapArenaSessionSnapshot(snapshot)
  return {
    headline: BOARD_STATUS_HEADLINES[view.status],
    status: view.status,
    detail: boardStatusDetail(view.status, snapshot),
  }
}

function resolveBoardStatus(
  snapshot: ArenaSessionSnapshot,
  team: ArenaSessionSnapshot['teams'][number] | null,
): ArenaSessionBoardStatus {
  switch (snapshot.session.sessionState) {
    case 'closed':
      return 'closed'
    case 'cancelled':
      return 'cancelled'
    case 'draining':
      return 'draining'
    default:
      break
  }

  if (
    snapshot.actor.memberState === 'left'
    || (Boolean(snapshot.actor.teamId) && snapshot.actor.presenceStatus === 'revoked')
  ) {
    return 'member_unavailable'
  }

  const statusTeam = team ?? findHostStatusTeam(snapshot.teams)

  switch (statusTeam?.status) {
    case 'queued':
    case 'on_deck':
    case 'active':
    case 'champion':
    case 'disputed':
      return statusTeam.status
    case 'retired':
    case 'removed':
      return 'member_unavailable'
    case 'forming':
    default:
      return 'forming'
  }
}

function findHostStatusTeam(
  teams: ArenaSessionSnapshot['teams'],
): ArenaSessionSnapshot['teams'][number] | null {
  const priority = ['active', 'champion', 'disputed', 'on_deck', 'queued', 'forming'] as const
  for (const status of priority) {
    const match = teams.find((candidate) => candidate.status === status)
    if (match) return match
  }
  return null
}

function boardStatusDetail(status: ArenaSessionBoardStatus, snapshot: ArenaSessionSnapshot): string {
  switch (status) {
    case 'forming':
      return 'เลือกทีมให้ครบ แล้วให้สมาชิกแต่ละคนยืนยันตำแหน่งและความพร้อมของตัวเอง'
    case 'queued':
      return 'ทีมพร้อมแล้ว ระบบจะเลื่อนคิวตามสถานะสนาม'
    case 'on_deck':
      return 'ทีมกำลังรอเข้าสู่รอบถัดไป'
    case 'active':
      return 'รอบนี้กำลังดำเนินอยู่'
    case 'champion':
      return 'ทีมของคุณครองสนามอยู่'
    case 'disputed':
      return 'รอบนี้ถูกเปิดให้ตรวจสอบ ผลยังไม่ถือเป็นข้อยุติ'
    case 'draining':
      return 'ไม่รับทีมใหม่ สนามจะปิดตาม deadline ที่แสดง'
    case 'closed':
      return 'Session นี้ไม่รับการกระทำเพิ่มเติม'
    case 'cancelled':
      return 'Session นี้ถูกยกเลิกและไม่สามารถกลับเข้าได้'
    case 'member_unavailable':
      return snapshot.actor.memberState === 'left'
        ? 'สมาชิกนี้ถูกยกเลิกการเข้าร่วมแล้ว ให้ Host จัดทีมใหม่ก่อนกลับเข้าสนาม'
        : 'ยืนยันตำแหน่งใหม่ด้วยตัวเองก่อนกลับเข้าสนาม'
  }
}

export function resolveArenaSessionArenaId(
  input: string | { arenaEventId?: string },
  output: ArenaSessionActionOutput,
): string {
  if (typeof input === 'string') return input
  if (typeof input.arenaEventId === 'string') return input.arenaEventId
  if (typeof output.result.arenaEventId === 'string') return output.result.arenaEventId
  return output.resourceId
}

export function resolveArenaSession({
  userId,
  arena,
  membershipCandidate,
}: ArenaSessionResolverInput): ArenaSessionState {
  if (arena?.status === 'closed' || arena?.status === 'cancelled') {
    return { status: arena.status, arenaId: arena.id }
  }

  if (!arena) {
    return membershipCandidate ? memberUnavailable(userId, membershipCandidate) : { status: 'idle' }
  }

  if (!membershipCandidate) return { status: 'idle' }

  const team = findCanonicalTeam(arena, membershipCandidate)
  const member = findCanonicalMember(team, arena, userId)

  if (
    membershipCandidate.userId !== userId
    || !membershipCandidate.isActive
    || membershipCandidate.arenaId !== arena.id
    || !team
    || !member?.is_active
  ) {
    return memberUnavailable(userId, membershipCandidate)
  }

  const memberState = {
    arenaId: arena.id,
    teamId: team.id,
    userId,
    acceptedAt: member.accepted_at,
  }

  if (team.status === 'forming') {
    return {
      ...memberState,
      status: 'forming',
      phase: member.accepted_at ? 'staged' : 'unready',
    }
  }

  if (CANONICAL_TEAM_STATUSES.has(team.status as ArenaSessionCanonicalTeamState['status'])) {
    return {
      ...memberState,
      status: team.status as ArenaSessionCanonicalTeamState['status'],
    }
  }

  return memberUnavailable(userId, membershipCandidate)
}

function findCanonicalTeam(
  arena: ArenaEvent,
  candidate: ArenaSessionMembershipCandidate,
): ArenaTeam | null {
  return arena.arena_teams?.find((team) => (
    team.id === candidate.arenaTeamId
    && team.arena_id === arena.id
  )) ?? null
}

function findCanonicalMember(
  team: ArenaTeam | null,
  arena: ArenaEvent,
  userId: string,
): ArenaTeamMember | null {
  return team?.arena_team_members?.find((member) => (
    member.arena_id === arena.id
    && member.arena_team_id === team.id
    && member.user_id === userId
  )) ?? null
}

function memberUnavailable(
  userId: string,
  candidate: ArenaSessionMembershipCandidate,
): ArenaSessionState {
  return {
    status: 'member_unavailable',
    arenaId: candidate.arenaId,
    teamId: candidate.arenaTeamId,
    userId,
    acceptedAt: candidate.acceptedAt,
  }
}
