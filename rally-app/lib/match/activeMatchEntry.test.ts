import { describe, expect, it } from 'vitest'
import { shouldAutoEnterActiveMatch } from './activeMatchEntry'

const confirmedStart = {
  status: 'in_progress',
  isMyParticipant: true,
  isTeamSportActivity: false,
  myTeamResultSubmitted: false,
  startPending: false,
  alreadyNavigated: false,
}

describe('shouldAutoEnterActiveMatch', () => {
  it('enters once the match is a server-confirmed in_progress run the player is in', () => {
    expect(shouldAutoEnterActiveMatch(confirmedStart)).toBe(true)
  })

  it('does NOT enter while the start mutation is still in flight (optimistic in_progress)', () => {
    // The regression: startMutation flips status to in_progress in onMutate before
    // the server confirms. Auto-navigating then sends the player into the submit /
    // live-GPS screen for a match that may roll back to pending on a rejected start.
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, startPending: true })).toBe(false)
  })

  it('does not enter for team-sport matches (they stay on the live court)', () => {
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, isTeamSportActivity: true })).toBe(false)
  })

  it('does not enter when the match has not actually started', () => {
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, status: 'pending' })).toBe(false)
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, status: undefined })).toBe(false)
  })

  it('does not enter when the local user is not a participant (e.g. a spectator)', () => {
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, isMyParticipant: false })).toBe(false)
  })

  it('does not re-enter once this match was already navigated into', () => {
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, alreadyNavigated: true })).toBe(false)
  })

  it('does not enter when the player already submitted their team result', () => {
    expect(shouldAutoEnterActiveMatch({ ...confirmedStart, myTeamResultSubmitted: true })).toBe(false)
  })
})
