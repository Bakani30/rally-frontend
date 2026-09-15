import {
  COOP_RUNNING_MIN_RUNNERS,
  RUNNING_GROUP_MAX_RUNNERS,
  deriveRunningMode,
  type RunningChallengeMode,
} from './matchConfig'
import type { RunningResultMode } from './runningRulePresets'
import { getInviteeName, getParticipantDisplayName, type MatchDetailState } from './matchRules'
import { getRoomAvatarInitials } from './basketballLobbyCourt'
import {
  RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY,
  RUNNING_CREW_MAP_ALPHA_FEATURE_KEY,
  RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY,
  type AlphaRunningFeatureKey,
} from '@/lib/run-tracking/alphaRunningGate'
import type { MatchInvite, MatchParticipant, MatchRefereeAssignment, MatchWithRelations, Side } from '@/types/match'

export type RunningLobbyModeKey = 'crew_map' | 'one_v_one_5k' | 'referee_result'

export type RunningLobbyModeCard = {
  key: RunningLobbyModeKey
  title: string
  hint: string
  icon: 'map-marker-path' | 'speedometer' | 'clipboard-edit-outline'
  badges: string[]
  featureKey: AlphaRunningFeatureKey
  enabled: boolean
  selected: boolean
  lockedLabel: string | null
  next: {
    runningMode: RunningChallengeMode
    runningResultMode: RunningResultMode
    teamSize: number
    minGroupSize?: number
  }
}

export type BuildRunningLobbyModeCardsInput = {
  runningMode: RunningChallengeMode | null
  runningResultMode: RunningResultMode
  canUseCrewMapAlpha: boolean
  canUseOneVOne5kPaceAlpha: boolean
  canUseRefereeRunResultAlpha: boolean
  gateLabels?: Partial<Record<AlphaRunningFeatureKey, string>>
}

export type RunningLobbyParticipantToken = {
  userId: string
  name: string
  initials: string
  avatarUrl: string | null
  leaderboardScore: number | null
  stakePoints: number
  accepted: boolean
  isMe: boolean
  isHost: boolean
}

export type RunningLobbyInviteToken = {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
}

export type RunningLobbySlot = {
  key: string
  side: Side | null
  label: string
  shortLabel: string
  x: number
  y: number
  state: 'occupied' | 'pending' | 'open'
  participant: RunningLobbyParticipantToken | null
  invite: RunningLobbyInviteToken | null
}

export type RunningLobbyRefereeSlot = {
  x: number
  y: number
  state: 'assigned' | 'invited' | 'open'
  label: string
  shortLabel: string
  referee: RunningLobbyInviteToken | null
}

export type RunningLobbyLayout = {
  mode: RunningLobbyModeKey
  title: string
  subtitle: string
  formatLabel: string
  badges: string[]
  slots: RunningLobbySlot[]
  refereeSlot: RunningLobbyRefereeSlot | null
  totalRunnerSlots: number
  openRunnerSlots: number
  readyCount: number
  readyCountLabel: string
}

export type BuildRunningLobbyLayoutOptions = {
  refereeAssignment?: MatchRefereeAssignment | null
}

export type RunningLobbyPrimaryAction =
  | { key: 'join'; side: Side }
  | { key: 'start' }
  | { key: 'invite' }
  | { key: 'ready' }
  | { key: 'unready' }
  | { key: 'waiting' }

export type RunningLobbySecondaryAction =
  | { key: 'unready' }
  | { key: 'stake' }
  | { key: 'invite' }
  | { key: 'leave' }
  | { key: 'cancel' }

export type RunningLobbyActionInput = {
  isParticipant: boolean
  isHost: boolean
  canJoin: boolean
  firstJoinSide: Side
  canStart: boolean
  canInvite: boolean
  myAccepted: boolean
  canEditStake: boolean
  canLeave: boolean
  canCancel: boolean
}

export type RunningLobbyActionPlan = {
  primary: RunningLobbyPrimaryAction
  sidecar: RunningLobbySecondaryAction | null
  secondary: RunningLobbySecondaryAction[]
}

const RACE_POINTS: Record<Side, { x: number; y: number; label: string; shortLabel: string }> = {
  0: { x: 34, y: 64, label: 'Runner A', shortLabel: 'A' },
  1: { x: 66, y: 36, label: 'Runner B', shortLabel: 'B' },
}

export function buildRunningLobbyModeCards(input: BuildRunningLobbyModeCardsInput): RunningLobbyModeCard[] {
  return [
    {
      key: 'crew_map',
      title: 'Crew Map Run',
      hint: 'วิ่งช่วยกัน เห็นทีมบน map และรวมระยะเป็น progress เดียว',
      icon: 'map-marker-path',
      badges: ['2-8 slots', '0 RP', 'Live map'],
      featureKey: RUNNING_CREW_MAP_ALPHA_FEATURE_KEY,
      enabled: input.canUseCrewMapAlpha,
      selected: input.runningMode === 'coop',
      lockedLabel: lockedLabel(input.canUseCrewMapAlpha, input.gateLabels?.[RUNNING_CREW_MAP_ALPHA_FEATURE_KEY]),
      next: {
        runningMode: 'coop',
        runningResultMode: 'manual',
        teamSize: COOP_RUNNING_MIN_RUNNERS,
        minGroupSize: COOP_RUNNING_MIN_RUNNERS,
      },
    },
    {
      key: 'one_v_one_5k',
      title: '1v1 5K Pace',
      hint: 'Whole workout ต้องครบ 5K; pace เฉลี่ยต่ำสุดชนะ',
      icon: 'speedometer',
      badges: ['2 slots', 'GPS', 'RP stake'],
      featureKey: RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY,
      enabled: input.canUseOneVOne5kPaceAlpha,
      selected: input.runningMode === 'race' && input.runningResultMode === 'sensor_pace_5k',
      lockedLabel: lockedLabel(input.canUseOneVOne5kPaceAlpha, input.gateLabels?.[RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY]),
      next: {
        runningMode: 'race',
        runningResultMode: 'sensor_pace_5k',
        teamSize: 1,
      },
    },
    {
      key: 'referee_result',
      title: 'Referee Run Result',
      hint: 'ห้องวิ่ง 1v1 มีกรรมการใส่ผล แล้วผู้เล่น confirm/dispute',
      icon: 'clipboard-edit-outline',
      badges: ['2 runners', 'Ref slot', 'Manual'],
      featureKey: RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY,
      enabled: input.canUseRefereeRunResultAlpha,
      selected: input.runningMode === 'race' && input.runningResultMode === 'manual',
      lockedLabel: lockedLabel(input.canUseRefereeRunResultAlpha, input.gateLabels?.[RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY]),
      next: {
        runningMode: 'race',
        runningResultMode: 'manual',
        teamSize: 1,
      },
    },
  ]
}

export function buildRunningLobbyLayout(
  match: MatchWithRelations,
  detail: MatchDetailState,
  currentUserId: string,
  options: BuildRunningLobbyLayoutOptions = {},
): RunningLobbyLayout | null {
  if (match.activity_type !== 'running') return null
  if (match.status !== 'pending' && match.status !== 'accepted') return null

  const mode = getRunningLobbyMode(match)
  if (!mode) return null

  if (mode === 'crew_map') {
    return buildCrewLayout(match, detail, currentUserId)
  }

  return buildRaceLayout(match, detail, currentUserId, mode, options.refereeAssignment ?? null)
}

export function buildRunningLobbyActions(input: RunningLobbyActionInput): RunningLobbyActionPlan {
  const primary = getPrimaryAction(input)
  const sidecar = input.canEditStake ? { key: 'stake' } satisfies RunningLobbySecondaryAction : null
  const secondary: RunningLobbySecondaryAction[] = []

  if (input.myAccepted && !input.isHost && primary.key !== 'unready') secondary.push({ key: 'unready' })
  if (input.isParticipant && input.canInvite && primary.key !== 'invite') secondary.push({ key: 'invite' })

  const dangerAction = getDangerAction(input)
  if (dangerAction) secondary.push(dangerAction)

  return { primary, sidecar, secondary }
}

function buildCrewLayout(
  match: MatchWithRelations,
  detail: MatchDetailState,
  currentUserId: string,
): RunningLobbyLayout {
  const totalRunnerSlots = clampRunnerCount(match.team_size_per_side)
  const slots = buildPoolSlots({
    match,
    currentUserId,
    participants: detail.sideA,
    invites: detail.pendingInvitesA,
    totalRunnerSlots,
  })

  return {
    mode: 'crew_map',
    title: 'Crew Map Run',
    subtitle: 'Team vs Goal',
    formatLabel: `${totalRunnerSlots} RUNNERS`,
    badges: ['TEAM GOAL', '0 RP', 'LIVE MAP'],
    slots,
    refereeSlot: null,
    totalRunnerSlots,
    openRunnerSlots: slots.filter((slot) => slot.state === 'open').length,
    readyCount: readyCount(detail.participants),
    readyCountLabel: `${readyCount(detail.participants)}/${totalRunnerSlots}`,
  }
}

function buildRaceLayout(
  match: MatchWithRelations,
  detail: MatchDetailState,
  currentUserId: string,
  mode: 'one_v_one_5k' | 'referee_result',
  refereeAssignment: MatchRefereeAssignment | null,
): RunningLobbyLayout {
  const slots = [
    buildSideSlot(match, detail.sideA, detail.pendingInvitesA, 0, currentUserId),
    buildSideSlot(match, detail.sideB, detail.pendingInvitesB, 1, currentUserId),
  ]
  const title = mode === 'one_v_one_5k' ? '1v1 5K Pace' : 'Referee Run Result'
  const badges = mode === 'one_v_one_5k'
    ? ['GPS', '5K', 'PACE']
    : ['REFEREE', '1V1', 'CONFIRM']

  return {
    mode,
    title,
    subtitle: mode === 'one_v_one_5k' ? 'Average pace wins' : 'Manual result room',
    formatLabel: '1V1',
    badges,
    slots,
    refereeSlot: mode === 'referee_result' ? buildRefereeSlot(refereeAssignment) : null,
    totalRunnerSlots: 2,
    openRunnerSlots: slots.filter((slot) => slot.state === 'open').length,
    readyCount: readyCount(detail.participants),
    readyCountLabel: `${readyCount(detail.participants)}/2`,
  }
}

function buildPoolSlots(input: {
  match: MatchWithRelations
  currentUserId: string
  participants: MatchParticipant[]
  invites: MatchInvite[]
  totalRunnerSlots: number
}): RunningLobbySlot[] {
  const occupants: Array<{ participant: MatchParticipant } | { invite: MatchInvite } | null> = [
    ...activeParticipants(input.participants).map((participant) => ({ participant })),
    ...input.invites.map((invite) => ({ invite })),
  ]

  return Array.from({ length: input.totalRunnerSlots }).map((_, index) => {
    const point = crewPoint(index, input.totalRunnerSlots)
    const occupant = occupants[index] ?? null
    return buildSlot({
      key: `crew:${index}`,
      side: 0,
      label: `Crew Slot ${index + 1}`,
      shortLabel: `${index + 1}`,
      point,
      occupant,
      match: input.match,
      currentUserId: input.currentUserId,
    })
  })
}

function buildSideSlot(
  match: MatchWithRelations,
  participants: MatchParticipant[],
  invites: MatchInvite[],
  side: Side,
  currentUserId: string,
): RunningLobbySlot {
  const point = RACE_POINTS[side]
  return buildSlot({
    key: `side:${side}`,
    side,
    label: point.label,
    shortLabel: point.shortLabel,
    point,
    occupant: activeParticipants(participants)[0]
      ? { participant: activeParticipants(participants)[0] }
      : invites[0]
        ? { invite: invites[0] }
        : null,
    match,
    currentUserId,
  })
}

function buildSlot(input: {
  key: string
  side: Side
  label: string
  shortLabel: string
  point: { x: number; y: number }
  occupant: { participant: MatchParticipant } | { invite: MatchInvite } | null
  match: MatchWithRelations
  currentUserId: string
}): RunningLobbySlot {
  if (input.occupant && 'participant' in input.occupant) {
    return {
      key: input.key,
      side: input.side,
      label: input.label,
      shortLabel: input.shortLabel,
      x: input.point.x,
      y: input.point.y,
      state: 'occupied',
      participant: participantToken(input.occupant.participant, input.match, input.currentUserId),
      invite: null,
    }
  }

  if (input.occupant && 'invite' in input.occupant) {
    return {
      key: input.key,
      side: input.side,
      label: input.label,
      shortLabel: input.shortLabel,
      x: input.point.x,
      y: input.point.y,
      state: 'pending',
      participant: null,
      invite: inviteToken(input.occupant.invite),
    }
  }

  return {
    key: input.key,
    side: input.side,
    label: input.label,
    shortLabel: input.shortLabel,
    x: input.point.x,
    y: input.point.y,
    state: 'open',
    participant: null,
    invite: null,
  }
}

function buildRefereeSlot(assignment: MatchRefereeAssignment | null): RunningLobbyRefereeSlot {
  const refereeName = assignment?.referee?.display_name || assignment?.referee?.handle || assignment?.referee?.email || null
  const state: RunningLobbyRefereeSlot['state'] =
    assignment?.status === 'invited' ? 'invited' : assignment ? 'assigned' : 'open'
  return {
    x: 50,
    y: 18,
    state,
    label: state === 'invited' ? 'Referee (Pending)' : assignment ? 'Referee' : 'Ref Slot',
    shortLabel: 'REF',
    referee: assignment && refereeName
      ? {
        id: assignment.id,
        name: refereeName,
        initials: getRoomAvatarInitials(refereeName),
        avatarUrl: assignment.referee?.avatar_url ?? null,
      }
      : null,
  }
}

function participantToken(
  participant: MatchParticipant,
  match: MatchWithRelations,
  currentUserId: string,
): RunningLobbyParticipantToken {
  const name = getParticipantDisplayName(participant)
  return {
    userId: participant.user_id,
    name,
    initials: getRoomAvatarInitials(name),
    avatarUrl: participant.users?.avatar_url ?? null,
    leaderboardScore: typeof participant.users?.leaderboard_score === 'number'
      ? participant.users.leaderboard_score
      : participant.rating_before,
    stakePoints: Number.isFinite(participant.stake_contribution)
      ? Math.max(0, participant.stake_contribution)
      : Math.max(0, match.stake),
    accepted: !!participant.accepted_at,
    isMe: participant.user_id === currentUserId,
    isHost: participant.user_id === match.created_by,
  }
}

function inviteToken(invite: MatchInvite): RunningLobbyInviteToken {
  const name = getInviteeName(invite)
  return {
    id: invite.id,
    name,
    initials: getRoomAvatarInitials(name),
    avatarUrl: invite.invitee?.avatar_url ?? null,
  }
}

function getRunningLobbyMode(match: MatchWithRelations): RunningLobbyModeKey | null {
  const runningMode = deriveRunningMode(match.activity_type, match.rule_params, match.is_coop)
  if (runningMode === 'coop') return 'crew_map'
  if (runningMode !== 'race') return null
  return match.rule_params?.mode === 'manual' ? 'referee_result' : 'one_v_one_5k'
}

function getPrimaryAction(input: RunningLobbyActionInput): RunningLobbyPrimaryAction {
  if (!input.isParticipant && input.canJoin) return { key: 'join', side: input.firstJoinSide }
  if (input.isParticipant && input.isHost && input.myAccepted) return { key: 'start' }
  if (input.canStart) return { key: 'start' }
  if (input.isParticipant && input.myAccepted) return { key: 'unready' }
  if (input.isParticipant && !input.myAccepted) return { key: 'ready' }
  if (input.canInvite) return { key: 'invite' }
  return { key: 'waiting' }
}

function getDangerAction(input: RunningLobbyActionInput): RunningLobbySecondaryAction | null {
  if (input.canLeave) return { key: 'leave' }
  if (input.canCancel) return { key: 'cancel' }
  return null
}

function crewPoint(index: number, total: number): { x: number; y: number } {
  const angle = (-90 + (360 / Math.max(1, total)) * index) * (Math.PI / 180)
  return {
    x: Math.round((50 + Math.cos(angle) * 34) * 10) / 10,
    y: Math.round((52 + Math.sin(angle) * 24) * 10) / 10,
  }
}

function readyCount(participants: MatchParticipant[]): number {
  return activeParticipants(participants).filter((participant) => participant.accepted_at).length
}

function activeParticipants(participants: MatchParticipant[]): MatchParticipant[] {
  return participants
    .filter((participant) => participant.is_active !== false)
    .sort(compareParticipantOrder)
}

function compareParticipantOrder(a: MatchParticipant, b: MatchParticipant): number {
  const joinedA = a.joined_at ?? ''
  const joinedB = b.joined_at ?? ''
  if (joinedA !== joinedB) return joinedA.localeCompare(joinedB)
  return a.user_id.localeCompare(b.user_id)
}

function clampRunnerCount(value: number): number {
  return Math.max(COOP_RUNNING_MIN_RUNNERS, Math.min(RUNNING_GROUP_MAX_RUNNERS, Math.round(value)))
}

function lockedLabel(enabled: boolean, label: string | undefined): string | null {
  if (enabled) return null
  return label ?? 'LOCKED'
}
