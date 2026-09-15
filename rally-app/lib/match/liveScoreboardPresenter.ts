export type QuarterPillState = 'done' | 'current' | 'upcoming'

export function deriveQuarterPills(boundaries: readonly unknown[] | null | undefined): QuarterPillState[] | null {
  if (boundaries == null) return null
  const ended = Math.min(boundaries.length, 4)
  return [0, 1, 2, 3].map((i) => (i < ended ? 'done' : i === ended ? 'current' : 'upcoming'))
}

export function formatElapsedClock(startedAt: string | null, nowMs: number): string {
  if (!startedAt) return '00:00'
  const start = new Date(startedAt).getTime()
  if (!Number.isFinite(start)) return '00:00'
  const total = Math.max(0, Math.floor((nowMs - start) / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export type SideHighlight = { aIsMine: boolean; bIsMine: boolean }

export function sideHighlight(mySide: 0 | 1 | null): SideHighlight {
  if (mySide === 0) return { aIsMine: true, bIsMine: false }
  if (mySide === 1) return { aIsMine: false, bIsMine: true }
  return { aIsMine: false, bIsMine: false }
}
