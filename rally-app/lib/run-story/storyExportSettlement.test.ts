import { describe, expect, it, vi } from 'vitest'

import { createPendingSettlement } from './storyExportSettlement'

describe('createPendingSettlement', () => {
  it('resolves exactly once and reports settled', () => {
    const resolve = vi.fn()
    const reject = vi.fn()
    const pending = createPendingSettlement<string>(resolve, reject)

    expect(pending.isSettled()).toBe(false)
    expect(pending.resolve('file:///a.mp4')).toBe(true)
    expect(pending.isSettled()).toBe(true)
    expect(resolve).toHaveBeenCalledWith('file:///a.mp4')
    expect(reject).not.toHaveBeenCalled()
  })

  it('rejects exactly once and reports settled', () => {
    const resolve = vi.fn()
    const reject = vi.fn()
    const pending = createPendingSettlement<string>(resolve, reject)

    const error = new Error('interrupted')
    expect(pending.reject(error)).toBe(true)
    expect(pending.isSettled()).toBe(true)
    expect(reject).toHaveBeenCalledWith(error)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('ignores a reject after a resolve (late interruption cannot clobber success)', () => {
    const resolve = vi.fn()
    const reject = vi.fn()
    const pending = createPendingSettlement<string>(resolve, reject)

    pending.resolve('file:///a.mp4')
    expect(pending.reject(new Error('interrupted'))).toBe(false)
    expect(reject).not.toHaveBeenCalled()
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('ignores a resolve after a reject (late stop cannot clobber failure)', () => {
    const resolve = vi.fn()
    const reject = vi.fn()
    const pending = createPendingSettlement<string>(resolve, reject)

    pending.reject(new Error('interrupted'))
    expect(pending.resolve('file:///a.mp4')).toBe(false)
    expect(resolve).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledTimes(1)
  })

  it('ignores double-resolve and double-reject', () => {
    const resolve = vi.fn()
    const reject = vi.fn()
    const pending = createPendingSettlement<string>(resolve, reject)

    pending.resolve('file:///a.mp4')
    expect(pending.resolve('file:///b.mp4')).toBe(false)
    expect(resolve).toHaveBeenCalledTimes(1)

    const pending2 = createPendingSettlement<string>(resolve, reject)
    pending2.reject(new Error('a'))
    expect(pending2.reject(new Error('b'))).toBe(false)
    expect(reject).toHaveBeenCalledTimes(1)
  })
})
