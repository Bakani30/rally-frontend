import type { SportPalette } from '@/constants/theme'
import type { Side } from '@/types/match'

// Lobby palette (user-specified 3-tone): orange accent + charcoal/cream that
// swap by mode — charcoal dominant in dark mode, cream dominant in light mode.
export const LOBBY_ORANGE = '#ff8a00'
export const LOBBY_ON_ORANGE = '#3a2400'
export const LOBBY_TEAM_B_COLOR = '#808bc3'

export type LobbyColors = { surface: string; panel: string; edge: string; ink: string; inkSoft: string; disabledFill: string }

export function lobbyColors(): LobbyColors {
  // The basketball match surface is dark-only (no light mode): always black
  // cards + light ink + orange accent, regardless of the app theme.
  return { surface: '#000000', panel: '#242428', edge: '#54545e', ink: '#ffffff', inkSoft: '#9a9aa2', disabledFill: '#34343c' }
}

// Team A = clean orange, Team B = fixed blue. By side, not relationship.
export function teamColor(side: Side): string {
  return side === 0 ? LOBBY_ORANGE : LOBBY_TEAM_B_COLOR
}

// Soft-surface shadow (Design v2) shared by the lobby cards. Kept as a
// function (rather than inlining `theme.shadowSoft` at each call site) so the
// arcade-era call signature — offset/opacity args, now unused — doesn't need
// to change at every consumer while the arcade-skin retirement lands screen
// by screen. See docs/design/rally-design-language.md §3.6.
export function arcadeShadow(
  theme: SportPalette,
  _offset: { width: number; height: number },
  _opacity: number,
) {
  return { boxShadow: theme.shadowSoft }
}
