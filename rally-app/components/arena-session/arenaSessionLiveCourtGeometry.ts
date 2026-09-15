import type { DimensionValue } from 'react-native'

import type { ArenaSessionActivity, ArenaSessionSnapshot } from '@/types/arenaSession'

type LiveRound = NonNullable<ArenaSessionSnapshot['liveRound']>
type LiveMember = LiveRound['champion']['members'][number]

export type ArenaCourtMarker = {
  member: LiveMember
  left: DimensionValue
  top: DimensionValue
  label: string
}

export function buildArenaCourtMarkers(
  members: LiveMember[],
  side: 'champion' | 'challenger',
  activityType: ArenaSessionActivity,
): ArenaCourtMarker[] {
  return members.map((member, index) => ({
    member,
    ...positionFor(member.positionKey, side, index, activityType),
  }))
}

function positionFor(
  positionKey: string | null,
  side: 'champion' | 'challenger',
  index: number,
  activityType: ArenaSessionActivity,
): Omit<ArenaCourtMarker, 'member'> {
  const key = positionKey?.toLowerCase() ?? ''
  const position = activityType === 'badminton'
    ? badmintonPosition(key, side, index)
    : basketballPosition(key, side, index)
  return {
    left: `${position.x}%` as DimensionValue,
    top: `${position.y}%` as DimensionValue,
    label: position.label,
  }
}

function badmintonPosition(key: string, side: 'champion' | 'challenger', index: number) {
  const topSide = side === 'champion'
  const fallback = topSide
    ? [{ x: 35, y: 27 }, { x: 65, y: 40 }][index % 2]
    : [{ x: 35, y: 60 }, { x: 65, y: 73 }][index % 2]
  if (key === 'duel') return { x: 50, y: topSide ? 34 : 66, label: '1V1' }
  if (key === 'front' || key === 'left') return { x: 35, y: topSide ? 40 : 60, label: 'หน้า' }
  if (key === 'rear' || key === 'back' || key === 'right') return { x: 65, y: topSide ? 27 : 73, label: 'หลัง' }
  return { ...fallback, label: 'ผู้เล่น' }
}

function basketballPosition(key: string, side: 'champion' | 'challenger', index: number) {
  const topSide = side === 'champion'
  const fallback = topSide
    ? [{ x: 28, y: 21 }, { x: 72, y: 21 }, { x: 50, y: 39 }][index % 3]
    : [{ x: 28, y: 79 }, { x: 72, y: 79 }, { x: 50, y: 61 }][index % 3]
  const positions: Record<string, { x: number; y: number; label: string }> = topSide
    ? {
        duel: { x: 50, y: 31, label: '1V1' },
        pg: { x: 50, y: 39, label: 'PG' },
        guard: { x: 50, y: 39, label: 'Guard' },
        sg: { x: 28, y: 21, label: 'SG' },
        sf: { x: 72, y: 21, label: 'SF' },
        wing: { x: 72, y: 21, label: 'Wing' },
        pf: { x: 35, y: 30, label: 'PF' },
        big: { x: 50, y: 27, label: 'Big' },
        c: { x: 50, y: 27, label: 'C' },
      }
    : {
        duel: { x: 50, y: 69, label: '1V1' },
        pg: { x: 50, y: 61, label: 'PG' },
        guard: { x: 50, y: 61, label: 'Guard' },
        sg: { x: 28, y: 79, label: 'SG' },
        sf: { x: 72, y: 79, label: 'SF' },
        wing: { x: 72, y: 79, label: 'Wing' },
        pf: { x: 35, y: 70, label: 'PF' },
        big: { x: 50, y: 73, label: 'Big' },
        c: { x: 50, y: 73, label: 'C' },
      }
  return positions[key] ?? { ...fallback, label: 'ผู้เล่น' }
}
