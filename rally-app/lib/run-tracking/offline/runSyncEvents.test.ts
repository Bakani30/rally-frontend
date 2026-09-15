import { describe, expect, it, vi } from 'vitest'
import { emitRunSyncChanged, subscribeRunSyncChanged } from './runSyncEvents'

describe('runSyncEvents', () => {
  it('delivers an emit to a live subscriber', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeRunSyncChanged(listener)

    emitRunSyncChanged()

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeRunSyncChanged(listener)

    unsubscribe()
    emitRunSyncChanged()

    expect(listener).not.toHaveBeenCalled()
  })

  it('fans out a single emit to every live subscriber', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeRunSyncChanged(first)
    const unsubscribeSecond = subscribeRunSyncChanged(second)

    emitRunSyncChanged()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    unsubscribeFirst()
    unsubscribeSecond()
  })
})
