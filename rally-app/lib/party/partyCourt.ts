import type { PartyActivity, PartyProfile, PartyTeamSize } from '@/types/party'

export type PartyCourtSlot = {
  positionKey: `slot-${number}`
  x: number
  y: number
  member: PartyProfile | null
}

export type PartyCourtLayout = {
  activityType: PartyActivity
  teamSize: PartyTeamSize
  slots: PartyCourtSlot[]
  bench: PartyProfile[]
}

const SLOT_POSITIONS: Record<PartyTeamSize, { x: number; y: number }[]> = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 35, y: 50 }, { x: 65, y: 50 }],
  3: [{ x: 50, y: 36 }, { x: 28, y: 66 }, { x: 72, y: 66 }],
  5: [{ x: 50, y: 30 }, { x: 28, y: 44 }, { x: 72, y: 44 }, { x: 34, y: 70 }, { x: 66, y: 70 }],
}

export function buildPartyCourtLayout(
  activityType: PartyActivity,
  teamSize: PartyTeamSize,
  activeRoster: PartyProfile[],
): PartyCourtLayout {
  const members = activeRoster.slice(0, 5)
  return {
    activityType,
    teamSize,
    slots: SLOT_POSITIONS[teamSize].map((position, index) => ({
      positionKey: `slot-${index + 1}`,
      ...position,
      member: members[index] ?? null,
    })),
    bench: members.slice(teamSize, 5),
  }
}
