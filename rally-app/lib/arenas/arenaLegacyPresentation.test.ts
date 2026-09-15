import { describe, expect, it } from 'vitest'

import { getLegacyArenaCapabilities } from './arenaLegacyPresentation'

describe('Legacy Arena presentation', () => {
  it('does not expose any legacy Arena mutation capability', () => {
    expect(getLegacyArenaCapabilities()).toEqual({
      canCreateTeam: false,
      canJoinRefereePool: false,
      canAdvanceQueue: false,
      canSubmitResult: false,
    })
  })
})
