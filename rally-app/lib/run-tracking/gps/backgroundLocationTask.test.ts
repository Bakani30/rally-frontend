import { describe, expect, it } from 'vitest'
import { isIgnorableSimulatorBackgroundLocationError } from './backgroundLocationError'

describe('isIgnorableSimulatorBackgroundLocationError', () => {
  it('ignores transient simulator CoreLocation task errors', () => {
    expect(
      isIgnorableSimulatorBackgroundLocationError(
        {
          code: 0,
          message: 'Error Domain=kCLErrorDomain Code=0 "(null)"',
        },
        false,
      ),
    ).toBe(true)
  })

  it('keeps the same CoreLocation error visible on a physical device', () => {
    expect(
      isIgnorableSimulatorBackgroundLocationError(
        {
          code: 0,
          message: 'Error Domain=kCLErrorDomain Code=0 "(null)"',
        },
        true,
      ),
    ).toBe(false)
  })

  it('does not suppress unrelated background location errors', () => {
    expect(
      isIgnorableSimulatorBackgroundLocationError(
        {
          code: 1,
          message: 'Location permission denied',
        },
        false,
      ),
    ).toBe(false)
  })
})
