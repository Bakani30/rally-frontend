import type { MatchStatus } from '@/types/match'

type Transition = {
  from: MatchStatus
  to: MatchStatus
}

const ALLOWED_TRANSITIONS: Transition[] = [
  { from: 'pending', to: 'accepted' },
  { from: 'pending', to: 'cancelled' },
  { from: 'accepted', to: 'in_progress' },
  { from: 'accepted', to: 'submitted' },
  { from: 'accepted', to: 'cancelled' },
  { from: 'in_progress', to: 'submitted' },
  { from: 'in_progress', to: 'cancelled' },
  { from: 'submitted', to: 'verified' },
  { from: 'submitted', to: 'disputed' },
  { from: 'verified', to: 'settled' },
]

export function canTransition(from: MatchStatus, to: MatchStatus): boolean {
  return ALLOWED_TRANSITIONS.some((transition) => {
    return transition.from === from && transition.to === to
  })
}

export function assertCanTransition(from: MatchStatus, to: MatchStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot transition match from ${from} to ${to}`)
  }
}
