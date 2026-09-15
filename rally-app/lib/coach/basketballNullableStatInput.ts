import { MAX_STAT_VALUE, type BasketballStatLine } from './coachTypes'

export type NullableBasketballStatValue = number | null

export function parseNullableBasketballStatInput(
  raw: string,
  current: NullableBasketballStatValue,
): NullableBasketballStatValue {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  if (!/^\d+$/.test(trimmed)) return current

  return clampBasketballStat(Number(trimmed))
}

export function stepNullableBasketballStat(
  value: NullableBasketballStatValue,
  delta: -1 | 1,
): NullableBasketballStatValue {
  if (value == null) return delta === 1 ? 1 : null
  return clampBasketballStat(value + delta)
}

export function setNullableBasketballStat(
  stats: BasketballStatLine,
  key: keyof BasketballStatLine,
  value: NullableBasketballStatValue,
): BasketballStatLine {
  if (value != null) return { ...stats, [key]: value }

  const next = { ...stats }
  delete next[key]
  return next
}

function clampBasketballStat(value: number): number {
  return Math.max(0, Math.min(MAX_STAT_VALUE, Math.trunc(value)))
}
