import { describe, expect, it } from 'vitest'
import { shouldNotifyRemovedFromRoom } from './lobbyPresence'

const kicked = {
  selfExitInitiated: false,
  wasParticipant: true,
  isMyParticipant: false,
  isPreStartPlayerLobby: true,
}

describe('shouldNotifyRemovedFromRoom', () => {
  it('notifies when the host removed a participant who did not initiate the exit', () => {
    expect(shouldNotifyRemovedFromRoom(kicked)).toBe(true)
  })

  it('stays silent when the user left on purpose (self-leave must not read as a kick)', () => {
    // The regression: a voluntary leave hard-deletes the same row a kick does,
    // so without the intent flag the leaver wrongly sees "the host removed you".
    expect(shouldNotifyRemovedFromRoom({ ...kicked, selfExitInitiated: true })).toBe(false)
  })

  it('stays silent while the user is still a participant', () => {
    expect(shouldNotifyRemovedFromRoom({ ...kicked, isMyParticipant: true })).toBe(false)
  })

  it('stays silent when the user was never a participant (e.g. a pending invitee)', () => {
    expect(shouldNotifyRemovedFromRoom({ ...kicked, wasParticipant: false })).toBe(false)
  })

  it('stays silent outside a pre-start player lobby (cancel/settle dismiss owns that)', () => {
    expect(shouldNotifyRemovedFromRoom({ ...kicked, isPreStartPlayerLobby: false })).toBe(false)
  })
})
