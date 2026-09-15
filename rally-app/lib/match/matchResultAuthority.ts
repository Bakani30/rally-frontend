export type MatchResultAuthority = 'arena' | 'legacy' | 'blocked'

export function classifyMatchResultAuthority(source: unknown): MatchResultAuthority {
  if (source === 'arena_round') return 'arena'
  if (source === 'legacy_standalone') return 'legacy'
  return 'blocked'
}
