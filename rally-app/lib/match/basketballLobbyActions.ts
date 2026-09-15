import type { Side } from '@/types/match'

export type BasketballLobbyPrimaryAction =
  | { key: 'join'; side: Side }
  | { key: 'start' }
  | { key: 'invite' }
  | { key: 'ready' }
  | { key: 'unready' }
  | { key: 'waiting' }

export type BasketballLobbySecondaryAction =
  | { key: 'unready' }
  | { key: 'stake' }
  | { key: 'invite' }
  | { key: 'leave' }
  | { key: 'cancel' }

export type BasketballLobbyActionInput = {
  isParticipant: boolean
  isHost: boolean
  canJoin: boolean
  firstJoinSide: Side
  canStart: boolean
  canInvite: boolean
  hasBothSides: boolean
  myAccepted: boolean
  canEditStake: boolean
  canLeave: boolean
  canCancel: boolean
}

export type BasketballLobbyActionPlan = {
  primary: BasketballLobbyPrimaryAction
  sidecar: BasketballLobbySecondaryAction | null
  secondary: BasketballLobbySecondaryAction[]
}

export function buildBasketballLobbyActions(input: BasketballLobbyActionInput): BasketballLobbyActionPlan {
  const primary = getPrimaryAction(input)
  const sidecar = input.canEditStake ? { key: 'stake' } satisfies BasketballLobbySecondaryAction : null
  const secondary: BasketballLobbySecondaryAction[] = []

  // Anyone who has accepted (host included) can un-ready, except when the primary
  // button is already the unready toggle (non-host accepted case) — avoids a dupe.
  if (input.myAccepted && primary.key !== 'unready') secondary.push({ key: 'unready' })
  if (input.isParticipant && input.canInvite && primary.key !== 'invite') {
    secondary.push({ key: 'invite' })
  }

  const dangerAction = getDangerAction(input)
  if (dangerAction) secondary.push(dangerAction)

  return { primary, sidecar, secondary }
}

function getPrimaryAction(input: BasketballLobbyActionInput): BasketballLobbyPrimaryAction {
  if (!input.isParticipant && input.canJoin) return { key: 'join', side: input.firstJoinSide }
  // The host readies up like everyone else first; once accepted, their primary
  // becomes START (gated to all-accepted via the button's disabled state).
  if (input.isParticipant && input.isHost) {
    return input.myAccepted ? { key: 'start' } : { key: 'ready' }
  }
  if (input.canStart) return { key: 'start' }
  if (input.isParticipant && input.myAccepted) return { key: 'unready' }
  if (input.isParticipant && !input.myAccepted) return { key: 'ready' }
  if (input.canInvite) return { key: 'invite' }
  return { key: 'waiting' }
}

function getDangerAction(input: BasketballLobbyActionInput): BasketballLobbySecondaryAction | null {
  if (input.canLeave) return { key: 'leave' }
  if (input.canCancel) return { key: 'cancel' }
  return null
}
