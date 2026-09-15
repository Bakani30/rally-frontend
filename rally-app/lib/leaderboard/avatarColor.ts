import { RallyPalette } from '@/constants/theme'

// Deterministic avatar color picker — same id always maps to same hue.
// Visual-only utility; safe to reorder palette without affecting persisted state.

const PALETTE = [
  '#eac31a',
  '#eb773c',
  '#808bc3',
  RallyPalette.green,
  '#c73f41',
  '#4d2323',
  '#161616',
] as const

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function avatarColorFor(seed: string): string {
  if (!seed) return PALETTE[0]
  return PALETTE[hash(seed) % PALETTE.length]
}

export function avatarLetterFor(displayName: string): string {
  const trimmed = (displayName ?? '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}
