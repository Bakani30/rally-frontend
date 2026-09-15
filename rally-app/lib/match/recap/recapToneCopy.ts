import type { RecapTone } from './matchRecapMoment'

export type RecapToneCopy = {
  eyebrow: string
  title: string
  confetti: boolean
}

export const RECAP_TONE_COPY: Record<RecapTone, RecapToneCopy> = {
  win: { eyebrow: 'MATCH RECAP', title: 'YOU WON', confetti: true },
  lose: { eyebrow: 'MATCH RECAP', title: 'YOU LOST', confetti: false },
  tie: { eyebrow: 'MATCH RECAP', title: 'TIE — STAKES RETURNED', confetti: false },
}
