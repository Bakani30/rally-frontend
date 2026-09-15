import type { ResolvedTitle } from '@/lib/cosmetics/cosmeticTypes'
import type { Tier } from '@/lib/leaderboard/tierRules'
import type { MatchDetailState } from '@/lib/match/matchRules'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type { MatchInvite, MatchParticipant, MatchWithRelations, Side } from '@/types/match'

export type TeamSportLobbyActivity = 'basketball' | 'badminton'

export type BasketballLobbyPositionKey =
  | 'duel'
  | 'left'
  | 'right'
  | 'pg'
  | 'sg'
  | 'sf'
  | 'pf'
  | 'c'

export type BasketballLobbyCourtKind = '1v1' | '2v2' | '3v3' | '5v5'

export type BasketballLobbyCourtSpot = {
  side: Side
  positionKey: BasketballLobbyPositionKey
  label: string
  shortLabel: string
  x: number
  y: number
  participant: BasketballLobbyCourtParticipant | null
  selectable: boolean
}

export type BasketballLobbyCourtParticipant = {
  userId: string
  side: Side
  name: string
  initials: string
  avatarUrl: string | null
  frameAssetRef: string | null
  jerseyNumber: number | null
  leaderboardScore: number | null
  stakePoints: number
  livePoints: number | null
  equippedTitle: ResolvedTitle | null
  tier: Tier | null
  accepted: boolean
  isMe: boolean
  isHost: boolean
  positionLabel: string | null
}

export type BasketballLobbyCourtInvite = {
  id: string
  side: Side
  name: string
  initials: string
  avatarUrl: string | null
}

export type BasketballLobbyCourtLayout = {
  activityType: TeamSportLobbyActivity
  kind: BasketballLobbyCourtKind
  teamSize: 1 | 2 | 3 | 5
  spots: BasketballLobbyCourtSpot[]
  invites: BasketballLobbyCourtInvite[]
  usePreferredPositionLabels: boolean
}

export type BasketballLobbyCourtOptions = {
  livePointsByUser?: Record<string, number>
  equippedTitlesByUser?: Record<string, ResolvedTitle>
  equippedFramesByUser?: Record<string, string>
  tiersByUser?: Record<string, Tier>
  preferredPositionShortByUser?: Record<string, string | null | undefined>
}

/** Empty 1v1/3v3 slots show availability only; 5v5 keeps court positions visible. */
export function getLobbyEmptySlotLabel(
  usePreferredPositionLabels: boolean,
  shortLabel: string,
): string | null {
  return usePreferredPositionLabels ? null : shortLabel
}

/** Compact lobby chip label for an occupied marker. */
export function formatLobbyPositionJersey(
  positionLabel: string | null,
  jerseyNumber: number | null,
): string {
  const jersey = jerseyNumber == null ? '--' : String(jerseyNumber)
  return positionLabel ? `${positionLabel} · ${jersey}` : jersey
}

type PositionDefinition = {
  key: BasketballLobbyPositionKey
  label: string
  shortLabel: string
  sideALabel?: string
  sideBLabel?: string
  sideAShortLabel?: string
  sideBShortLabel?: string
  sideA: { x: number; y: number }
  sideB: { x: number; y: number }
}

const ONE_V_ONE_POSITIONS: PositionDefinition[] = [
  {
    key: 'duel',
    label: 'Duel',
    shortLabel: '1',
    sideALabel: 'Inner Ring',
    sideBLabel: 'Outer Ring',
    sideAShortLabel: 'IN',
    sideBShortLabel: 'OUT',
    sideA: { x: 50, y: 38 },
    sideB: { x: 50, y: 62 },
  },
]

// 3v3 reuses the standard basketball vocabulary (a subset of the 5v5
// positions) so the lobby, picker, and profile card share one set of
// abbreviations: backcourt -> PG, wing -> SF, paint -> C.
const THREE_V_THREE_POSITIONS: PositionDefinition[] = [
  {
    key: 'pg',
    label: 'Point Guard',
    shortLabel: 'PG',
    sideA: { x: 50, y: 37 },
    sideB: { x: 50, y: 63 },
  },
  {
    key: 'sf',
    label: 'Small Forward',
    shortLabel: 'SF',
    sideA: { x: 25, y: 25 },
    sideB: { x: 75, y: 75 },
  },
  {
    key: 'c',
    label: 'Center',
    shortLabel: 'C',
    sideA: { x: 75, y: 25 },
    sideB: { x: 25, y: 75 },
  },
]

// 3 depth bands per half kept inside the visible (crop-safe) court band: PF/C
// closest to the baseline at ~22%, SG/SF on the wings, PG near center. The
// full-court photo clips the empty baselines, so no marker sits below ~22%.
const FIVE_V_FIVE_POSITIONS: PositionDefinition[] = [
  {
    key: 'pg',
    label: 'Point Guard',
    shortLabel: 'PG',
    sideA: { x: 50, y: 38 },
    sideB: { x: 50, y: 62 },
  },
  {
    key: 'sg',
    label: 'Shooting Guard',
    shortLabel: 'SG',
    sideA: { x: 22, y: 30 },
    sideB: { x: 78, y: 70 },
  },
  {
    key: 'sf',
    label: 'Small Forward',
    shortLabel: 'SF',
    sideA: { x: 78, y: 30 },
    sideB: { x: 22, y: 70 },
  },
  {
    key: 'pf',
    label: 'Power Forward',
    shortLabel: 'PF',
    sideA: { x: 33, y: 25 },
    sideB: { x: 67, y: 75 },
  },
  {
    key: 'c',
    label: 'Center',
    shortLabel: 'C',
    sideA: { x: 67, y: 25 },
    sideB: { x: 33, y: 75 },
  },
]

const BADMINTON_ONE_V_ONE_POSITIONS: PositionDefinition[] = [
  {
    key: 'duel',
    label: 'Singles',
    shortLabel: '1',
    sideALabel: 'Near Court',
    sideBLabel: 'Far Court',
    sideAShortLabel: 'NEAR',
    sideBShortLabel: 'FAR',
    sideA: { x: 50, y: 72 },
    sideB: { x: 50, y: 28 },
  },
]

const BADMINTON_TWO_V_TWO_POSITIONS: PositionDefinition[] = [
  {
    key: 'left',
    label: 'Left Court',
    shortLabel: 'L',
    sideA: { x: 35, y: 72 },
    sideB: { x: 35, y: 28 },
  },
  {
    key: 'right',
    label: 'Right Court',
    shortLabel: 'R',
    sideA: { x: 65, y: 72 },
    sideB: { x: 65, y: 28 },
  },
]

export function buildBasketballLobbyCourt(
  match: MatchWithRelations,
  detail: MatchDetailState,
  currentUserId: string,
  options: BasketballLobbyCourtOptions = {},
): BasketballLobbyCourtLayout | null {
  return buildTeamSportLobbyCourt(match, detail, currentUserId, options)
}

export function buildTeamSportLobbyCourt(
  match: MatchWithRelations,
  detail: MatchDetailState,
  currentUserId: string,
  options: BasketballLobbyCourtOptions = {},
): BasketballLobbyCourtLayout | null {
  const activityType = getTeamSportLobbyActivity(match.activity_type)
  if (!activityType) return null
  if (match.is_coop) return null
  const definitions = getTeamSportLobbyPositionDefinitions(activityType, match.team_size_per_side)
  if (!definitions) return null
  if (!isTeamSportLobbyStatusSupported(activityType, match.status)) return null

  const assigned = new Map<string, MatchParticipant>()

  assignPersistedPositions(assigned, definitions, detail.sideA, 0)
  assignPersistedPositions(assigned, definitions, detail.sideB, 1)
  assignFallbackPositions(assigned, definitions, detail.sideA, 0)
  assignFallbackPositions(assigned, definitions, detail.sideB, 1)

  const currentParticipant = activeParticipants([...detail.sideA, ...detail.sideB])
    .find((participant) => participant.user_id === currentUserId)
  const canSelectPosition = match.status === 'pending' || match.status === 'accepted'
  const selectableSide = canSelectPosition ? currentParticipant?.side ?? null : null
  const canSelectAnySide = match.status === 'pending'
  const usePreferredPositionLabels = activityType === 'basketball'
    && (match.team_size_per_side === 1 || match.team_size_per_side === 3)
  const currentUserSide = currentParticipant?.side ?? null

  const spots = definitions.flatMap((definition) => [
    buildSpot(definition, 0, assigned.get(spotKey(0, definition.key)) ?? null, match, currentUserId, selectableSide, canSelectAnySide, usePreferredPositionLabels, currentUserSide, options),
    buildSpot(definition, 1, assigned.get(spotKey(1, definition.key)) ?? null, match, currentUserId, selectableSide, canSelectAnySide, usePreferredPositionLabels, currentUserSide, options),
  ])

  const kind = `${match.team_size_per_side}v${match.team_size_per_side}` as BasketballLobbyCourtKind

  return {
    activityType,
    kind,
    teamSize: match.team_size_per_side as 1 | 2 | 3 | 5,
    spots,
    invites: [
      ...detail.pendingInvitesA.map((invite) => inviteChip(invite)),
      ...detail.pendingInvitesB.map((invite) => inviteChip(invite)),
    ],
    usePreferredPositionLabels,
  }
}

export function isBasketballLobbyPositionKey(value: string): value is BasketballLobbyPositionKey {
  return ONE_V_ONE_POSITIONS.some((position) => position.key === value)
    || THREE_V_THREE_POSITIONS.some((position) => position.key === value)
    || FIVE_V_FIVE_POSITIONS.some((position) => position.key === value)
}

export function isTeamSportLobbyPositionKey(
  activityType: TeamSportLobbyActivity,
  teamSize: number,
  value: string,
): value is BasketballLobbyPositionKey {
  return getTeamSportLobbyPositionDefinitions(activityType, teamSize)
    ?.some((position) => position.key === value) ?? false
}

export function isSupportedTeamSportLobbyTeamSize(
  activityType: TeamSportLobbyActivity,
  teamSize: number,
): teamSize is 1 | 2 | 3 | 5 {
  return getTeamSportLobbyPositionDefinitions(activityType, teamSize) != null
}

function getTeamSportLobbyActivity(activityType: string): TeamSportLobbyActivity | null {
  return activityType === 'basketball' || activityType === 'badminton' ? activityType : null
}

function getTeamSportLobbyPositionDefinitions(
  activityType: TeamSportLobbyActivity,
  teamSize: number,
): PositionDefinition[] | null {
  if (activityType === 'badminton') {
    if (teamSize === 1) return BADMINTON_ONE_V_ONE_POSITIONS
    if (teamSize === 2) return BADMINTON_TWO_V_TWO_POSITIONS
    return null
  }

  if (teamSize === 1) return ONE_V_ONE_POSITIONS
  if (teamSize === 3) return THREE_V_THREE_POSITIONS
  if (teamSize === 5) return FIVE_V_FIVE_POSITIONS
  return null
}

function isTeamSportLobbyStatusSupported(
  activityType: TeamSportLobbyActivity,
  status: MatchWithRelations['status'],
): boolean {
  if (status === 'pending' || status === 'accepted') return true
  return activityType === 'basketball' && (status === 'in_progress' || status === 'settled')
}

function assignPersistedPositions(
  assigned: Map<string, MatchParticipant>,
  definitions: PositionDefinition[],
  participants: MatchParticipant[],
  side: Side,
) {
  const allowed = new Set(definitions.map((definition) => definition.key))
  for (const participant of activeParticipants(participants)) {
    const positionKey = participant.lobby_position_key
    if (!positionKey || !allowed.has(positionKey as BasketballLobbyPositionKey)) continue
    const key = spotKey(side, positionKey as BasketballLobbyPositionKey)
    if (!assigned.has(key)) assigned.set(key, participant)
  }
}

function assignFallbackPositions(
  assigned: Map<string, MatchParticipant>,
  definitions: PositionDefinition[],
  participants: MatchParticipant[],
  side: Side,
) {
  const orderedParticipants = activeParticipants(participants)
    .filter((participant) => !isAssigned(assigned, participant))
    .sort(compareParticipantOrder)

  for (const participant of orderedParticipants) {
    const openDefinition = definitions.find((definition) => !assigned.has(spotKey(side, definition.key)))
    if (!openDefinition) return
    assigned.set(spotKey(side, openDefinition.key), participant)
  }
}

function buildSpot(
  definition: PositionDefinition,
  side: Side,
  participant: MatchParticipant | null,
  match: MatchWithRelations,
  currentUserId: string,
  selectableSide: Side | null,
  canSelectAnySide: boolean,
  usePreferredPositionLabels: boolean,
  currentUserSide: Side | null,
  options: BasketballLobbyCourtOptions,
): BasketballLobbyCourtSpot {
  const point = side === 0 ? definition.sideA : definition.sideB
  const label = side === 0
    ? definition.sideALabel ?? definition.label
    : definition.sideBLabel ?? definition.label
  const shortLabel = side === 0
    ? definition.sideAShortLabel ?? definition.shortLabel
    : definition.sideBShortLabel ?? definition.shortLabel
  const selectable = usePreferredPositionLabels
    ? !participant && canSelectAnySide && currentUserSide != null && side !== currentUserSide
    : !participant && selectableSide != null && (canSelectAnySide || selectableSide === side)
  return {
    side,
    positionKey: definition.key,
    label,
    shortLabel,
    x: point.x,
    y: point.y,
    participant: participant
      ? {
          ...participantToken(participant, match, currentUserId, options),
          // 5v5 uses the occupied court role; 1v1/3v3 use the onboarding
          // preference when one is available. #96 surfaces it on tap too
          // (BasketballLobbyPlayerPopup).
          positionLabel: usePreferredPositionLabels
            ? normalizePreferredPositionLabel(options.preferredPositionShortByUser?.[participant.user_id])
            : shortLabel,
        }
      : null,
    selectable,
  }
}

function normalizePreferredPositionLabel(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function participantToken(
  participant: MatchParticipant,
  match: MatchWithRelations,
  currentUserId: string,
  options: BasketballLobbyCourtOptions,
): Omit<BasketballLobbyCourtParticipant, 'positionLabel'> {
  const name = getParticipantDisplayName(participant)
  return {
    userId: participant.user_id,
    side: participant.side,
    name,
    initials: getRoomAvatarInitials(name),
    avatarUrl: participant.users?.avatar_url ?? null,
    frameAssetRef: options.equippedFramesByUser?.[participant.user_id] ?? null,
    jerseyNumber: sanitizeJerseyNumber(participant.users?.jersey_number),
    leaderboardScore: typeof participant.users?.leaderboard_score === 'number'
      ? participant.users.leaderboard_score
      : participant.rating_before,
    stakePoints: Number.isFinite(participant.stake_contribution)
      ? Math.max(0, participant.stake_contribution)
      : Math.max(0, match.stake),
    livePoints: options.livePointsByUser?.[participant.user_id] ?? null,
    equippedTitle: options.equippedTitlesByUser?.[participant.user_id] ?? null,
    tier: options.tiersByUser?.[participant.user_id] ?? null,
    accepted: !!participant.accepted_at,
    isMe: participant.user_id === currentUserId,
    isHost: participant.user_id === match.created_by,
  }
}

function inviteChip(invite: MatchInvite): BasketballLobbyCourtInvite {
  const name = invite.invitee?.display_name ?? invite.invitee?.handle ?? invite.invitee?.email ?? 'Invite'
  return {
    id: invite.id,
    side: invite.side,
    name,
    initials: getRoomAvatarInitials(name),
    avatarUrl: invite.invitee?.avatar_url ?? null,
  }
}

function activeParticipants(participants: MatchParticipant[]): MatchParticipant[] {
  return participants.filter((participant) => participant.is_active !== false)
}

function compareParticipantOrder(a: MatchParticipant, b: MatchParticipant): number {
  const joinedA = a.joined_at ?? ''
  const joinedB = b.joined_at ?? ''
  if (joinedA !== joinedB) return joinedA.localeCompare(joinedB)
  return a.user_id.localeCompare(b.user_id)
}

function isAssigned(assigned: Map<string, MatchParticipant>, participant: MatchParticipant): boolean {
  return Array.from(assigned.values()).some((candidate) => candidate.user_id === participant.user_id)
}

function spotKey(side: Side, positionKey: BasketballLobbyPositionKey): string {
  return `${side}:${positionKey}`
}

function sanitizeJerseyNumber(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 99
    ? value as number
    : null
}

export function groupSpotsBySide(
  layout: BasketballLobbyCourtLayout,
): { side: Side; spots: BasketballLobbyCourtSpot[] }[] {
  return [0, 1].map((side) => ({
    side: side as Side,
    spots: layout.spots.filter((spot) => spot.side === side),
  }))
}

export function getRoomAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
