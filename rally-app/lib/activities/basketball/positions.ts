// Canonical basketball positions — single source of truth for the
// abbreviations shown on the profile Rankings card, the position picker,
// and the lobby court. Keys match match_participants.lobby_position_key
// and user_sport_positions.position_key.

export type BasketballPositionKey = 'pg' | 'sg' | 'sf' | 'pf' | 'c'

export type BasketballPosition = {
  key: BasketballPositionKey
  label: string // full name, e.g. "Point Guard"
  short: string // abbreviation, e.g. "PG"
}

export const BASKETBALL_POSITIONS: readonly BasketballPosition[] = [
  { key: 'pg', label: 'Point Guard', short: 'PG' },
  { key: 'sg', label: 'Shooting Guard', short: 'SG' },
  { key: 'sf', label: 'Small Forward', short: 'SF' },
  { key: 'pf', label: 'Power Forward', short: 'PF' },
  { key: 'c', label: 'Center', short: 'C' },
] as const

const BY_KEY = new Map<string, BasketballPosition>(
  BASKETBALL_POSITIONS.map((position) => [position.key, position]),
)

/** Abbreviation for a stored position key, or null when unknown/unset. */
export function basketballPositionShort(key: string | null | undefined): string | null {
  if (!key) return null
  return BY_KEY.get(key)?.short ?? null
}
