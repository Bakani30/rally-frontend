import { describe, expect, it } from 'vitest'

import { buildBasketballLobbyActions } from './basketballLobbyActions'

const baseInput = {
  isParticipant: true,
  isHost: false,
  canJoin: false,
  firstJoinSide: 0 as const,
  canStart: false,
  canInvite: true,
  hasBothSides: false,
  myAccepted: false,
  canEditStake: true,
  canLeave: false,
  canCancel: true,
}

describe('buildBasketballLobbyActions', () => {
  it('uses ready as primary for participants and keeps stake as the sidecar action', () => {
    const actions = buildBasketballLobbyActions(baseInput)

    expect(actions.primary).toEqual({ key: 'ready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['invite', 'cancel'])
  })

  it('keeps invite visible once both sides are present while seats remain open', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      hasBothSides: true,
    })

    expect(actions.primary).toEqual({ key: 'ready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['invite', 'cancel'])
  })

  it('hides invite when the lobby has no remaining invite slot', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      canInvite: false,
      hasBothSides: true,
    })

    expect(actions.primary).toEqual({ key: 'ready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['cancel'])
  })

  it('turns the primary button into unready when the current player is already ready', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      hasBothSides: true,
      myAccepted: true,
    })

    expect(actions.primary).toEqual({ key: 'unready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['invite', 'cancel'])
  })

  it('keeps invite secondary after ready when the other side is still empty', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      myAccepted: true,
    })

    expect(actions.primary).toEqual({ key: 'unready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['invite', 'cancel'])
  })

  it('asks the host to ready up like everyone else before they have accepted', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      isHost: true,
      myAccepted: false,
    })

    expect(actions.primary).toEqual({ key: 'ready' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['invite', 'cancel'])
  })

  it('gives the accepted host start as primary plus an unready toggle while not yet startable', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      isHost: true,
      myAccepted: true,
    })

    expect(actions.primary).toEqual({ key: 'start' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['unready', 'invite', 'cancel'])
  })

  it('keeps the unready toggle next to start once the host is ready and the lobby is startable', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      isHost: true,
      canInvite: false,
      canStart: true,
      hasBothSides: true,
      myAccepted: true,
    })

    expect(actions.primary).toEqual({ key: 'start' })
    expect(actions.sidecar).toEqual({ key: 'stake' })
    expect(actions.secondary.map((action) => action.key)).toEqual(['unready', 'cancel'])
  })

  it('uses join as primary for non-participants', () => {
    const actions = buildBasketballLobbyActions({
      ...baseInput,
      isParticipant: false,
      canJoin: true,
      firstJoinSide: 1,
      canEditStake: false,
      canCancel: false,
    })

    expect(actions.primary).toEqual({ key: 'join', side: 1 })
    expect(actions.sidecar).toBeNull()
    expect(actions.secondary).toEqual([])
  })
})
