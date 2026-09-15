// Preferred play-style / role per activity, shown on the profile Rankings
// card and chosen via the picker. Keys are stored in
// user_sport_positions.position_key (lowercased abbreviation, stable).
//
// Basketball roles double as court positions and reuse BASKETBALL_POSITIONS
// (the same vocabulary the lobby uses). Running/badminton roles are
// profile-only roles and have no lobby coupling.

import { BASKETBALL_POSITIONS } from '@/lib/activities/basketball/positions'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'

type RoleLabelKey = keyof typeof onboardingDictionary

export type PlayerRole = {
  key: string
  labelKey: RoleLabelKey
  short: string // abbreviation, e.g. "MTR"
}

export type ActivityRoleConfig = {
  cellLabel: string // short header shown on the card stat cell
  pickerTitle: string // modal title
  roles: readonly PlayerRole[]
}

const BASKETBALL_ROLES: readonly PlayerRole[] = BASKETBALL_POSITIONS.map((position) => ({
  key: position.key,
  labelKey: `position_${position.key}` as RoleLabelKey,
  short: position.short,
})) as readonly PlayerRole[]

const RUNNING_ROLES: readonly PlayerRole[] = [
  { key: 'marathon', labelKey: 'style_marathon', short: 'MAR' },
  { key: 'trail', labelKey: 'style_trail', short: 'TRL' },
  { key: 'track', labelKey: 'style_track', short: 'TRK' },
  { key: 'fun_run', labelKey: 'style_fun_run', short: 'FUN' },
  { key: 'race', labelKey: 'style_race', short: 'RACE' },
] as const

const BADMINTON_ROLES: readonly PlayerRole[] = [
  { key: 'front', labelKey: 'bmpos_front', short: 'FRT' },
  { key: 'rear', labelKey: 'bmpos_rear', short: 'REAR' },
  { key: 'defense', labelKey: 'bmpos_defense', short: 'DEF' },
  { key: 'rotation', labelKey: 'bmpos_rotation', short: 'ROT' },
] as const

export const ACTIVITY_ROLES: Record<string, ActivityRoleConfig> = {
  basketball: {
    cellLabel: 'POSITION',
    pickerTitle: 'ตำแหน่งที่ชอบเล่น',
    roles: BASKETBALL_ROLES,
  },
  running: {
    cellLabel: 'STYLE',
    pickerTitle: 'สายวิ่งที่ถนัด',
    roles: RUNNING_ROLES,
  },
  badminton: {
    cellLabel: 'POSITION',
    pickerTitle: 'ตำแหน่งที่ชอบเล่น',
    roles: BADMINTON_ROLES,
  },
}

/** Role config for an activity, or null when it has no role picker. */
export function activityRoleConfig(activity: string): ActivityRoleConfig | null {
  return ACTIVITY_ROLES[activity] ?? null
}

/** Abbreviation for a stored role key within an activity, or null. */
export function roleShort(activity: string, key: string | null | undefined): string | null {
  if (!key) return null
  return ACTIVITY_ROLES[activity]?.roles.find((role) => role.key === key)?.short ?? null
}
