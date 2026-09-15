import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('compassPort', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock('expo-location')
  })

  it('falls back to a no-op subscription when native heading rejects for permission', async () => {
    const watchHeadingAsync = vi
      .fn()
      .mockRejectedValue(new Error('Location permission is required to do this operation'))
    vi.doMock('expo-location', () => ({ watchHeadingAsync }))

    const { compassPort } = await import('./compassPort')
    const unsubscribe = await compassPort.subscribe(vi.fn())

    expect(watchHeadingAsync).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toEqual(expect.any(Function))
    expect(() => unsubscribe()).not.toThrow()
  })
})
