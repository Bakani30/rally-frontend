// join_code: server-generated random code (matches generate_join_code() in
// supabase migration 20260101000007_team_match.sql — 8 chars from
// ABCDEFGHJKLMNPQRSTUVWXYZ23456789, no ambiguous glyphs).
export const JOIN_CODE_LENGTH = 8
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const JOIN_CODE_STRIP = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g

export function normalizeJoinCode(value: string): string {
  return value.toUpperCase().replace(JOIN_CODE_STRIP, '').slice(0, JOIN_CODE_LENGTH)
}

export function isCompleteJoinCode(value: string): boolean {
  return value.length === JOIN_CODE_LENGTH && !JOIN_CODE_STRIP.test(value)
}

// entry_code: 6-digit password set by the room creator (numeric only).
export const ENTRY_CODE_LENGTH = 6

export function normalizeEntryCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, ENTRY_CODE_LENGTH)
}

export function isCompleteEntryCode(value: string): boolean {
  return /^\d{6}$/.test(value)
}
