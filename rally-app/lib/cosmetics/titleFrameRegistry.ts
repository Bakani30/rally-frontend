// Maps a title cosmetic `code` to a special animated frame style, mirroring
// the `profileFrameRegistry` pattern for avatar frames. Codes with no entry
// fall back to the plain rarity-colored chip (see TitleFrame.tsx).
//
// Pure data only — no React/RN imports — so it can be unit-tested and reused
// by both the epithet screen and the match lobby.

export type TitleFrameStyle = {
  kind: 'cyberpunk'
  accentColor: string
  glitchIntensity: number
}

const TITLE_FRAME_BY_CODE: Record<string, TitleFrameStyle> = {
  title_beta_tester: { kind: 'cyberpunk', accentColor: '#FF1F3D', glitchIntensity: 0.85 },
}

export function getTitleFrameStyle(code: string | null | undefined): TitleFrameStyle | null {
  if (!code) return null
  return TITLE_FRAME_BY_CODE[code] ?? null
}

export function hasTitleFrame(code: string | null | undefined): boolean {
  return getTitleFrameStyle(code) !== null
}
