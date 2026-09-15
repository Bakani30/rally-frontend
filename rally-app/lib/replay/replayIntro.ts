import type { ReplayMapProvider } from '@/lib/maps/replayMapProvider'

export type ReplayIntroPhase = 'preloading' | 'overview' | 'dive' | 'chase'

export const REPLAY_OVERVIEW_HOLD_MS = 700
export const REPLAY_DIVE_DURATION_MS = 1_000

export function initialReplayIntroPhase(
  platform: string,
  provider: ReplayMapProvider,
): ReplayIntroPhase {
  return platform === 'ios' && provider === 'apple' ? 'preloading' : 'chase'
}

export function nextReplayIntroPhase(phase: ReplayIntroPhase): ReplayIntroPhase {
  if (phase === 'preloading') return 'overview'
  if (phase === 'overview') return 'dive'
  return 'chase'
}

export function shouldAdvanceReplayProgress(phase: ReplayIntroPhase): boolean {
  return phase === 'chase'
}
