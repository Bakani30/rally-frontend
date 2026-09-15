import type { NextAction } from '@/lib/match/matchNextAction'

export type MatchNextActionSubmitView = {
  icon: 'clipboard-check-outline'
  tone: 'green'
  title: string
  sub: string
  cta: { label: string }
}

export function getSubmitResultActionView(action: NextAction): MatchNextActionSubmitView | null {
  if (action.kind !== 'submit_result') return null
  return {
    icon: 'clipboard-check-outline',
    tone: 'green',
    title: 'Match is live',
    sub: 'Record your score when play is done.',
    cta: { label: 'Submit score' },
  }
}
