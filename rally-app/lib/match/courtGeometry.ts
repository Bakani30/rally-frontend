// FIBA court geometry in METERS — single source of truth for the drawn court
// and for tournament features later. Pixel scaling happens once at render.
export type CourtKind = 'full' | 'half'

export const FIBA = {
  fullCourt: { width: 15, length: 28 },
  halfCourt: { width: 15, length: 11 }, // FIBA 3x3
  centerCircleRadius: 1.8,
  threePointRadius: 6.75,
  threePointCornerOffset: 0.9,
  keyWidth: 4.9,
  keyLength: 5.8,
  freeThrowCircleRadius: 1.8,
  noChargeRadius: 1.25,
  backboardWidth: 1.8,
  backboardFromBaseline: 1.2,
  hoopFromBaseline: 1.575,
} as const

// Extra plain floor below the 3x3 half court so markers/nameplates have room
// on a phone-width render without shrinking the court lines.
export const HALF_COURT_APRON_LENGTH = 9

export function courtKindForTeamSize(teamSize: number): CourtKind {
  // 2026-07-12: All formats (1v1, 2v2, 3v3, 5v5) render on the full court (founder revision)
  return 'full'
}

export function courtDrawable(kind: CourtKind): { width: number; length: number } {
  if (kind === 'full') return { ...FIBA.fullCourt }
  return { width: FIBA.halfCourt.width, length: FIBA.halfCourt.length + HALF_COURT_APRON_LENGTH }
}

export function courtAspect(kind: CourtKind): number {
  const box = courtDrawable(kind)
  return box.length / box.width
}

export function threePointGeometry(): {
  cornerLineFromSideline: number
  cornerLineLength: number
  radius: number
} {
  const halfWidth = FIBA.fullCourt.width / 2
  const dx = halfWidth - FIBA.threePointCornerOffset
  const dy = Math.sqrt(FIBA.threePointRadius ** 2 - dx ** 2)
  return {
    cornerLineFromSideline: FIBA.threePointCornerOffset,
    cornerLineLength: FIBA.hoopFromBaseline + dy,
    radius: FIBA.threePointRadius,
  }
}
