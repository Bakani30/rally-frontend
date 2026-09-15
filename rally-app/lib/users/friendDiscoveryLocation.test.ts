import { describe, expect, it } from 'vitest'

import {
  FRIEND_DISCOVERY_CELL_DEGREES,
  isFriendDiscoveryLocationAgeEligible,
  toFriendDiscoveryCell,
} from './friendDiscoveryLocation'

describe('isFriendDiscoveryLocationAgeEligible', () => {
  const now = new Date('2030-01-01T00:00:00Z')

  it('allows a user who has reached 15', () => {
    expect(isFriendDiscoveryLocationAgeEligible('2015-01-01', now)).toBe(true)
  })

  it('blocks a user who is still under 15', () => {
    expect(isFriendDiscoveryLocationAgeEligible('2015-01-02', now)).toBe(false)
  })

  it('fails closed when DOB is missing or invalid', () => {
    expect(isFriendDiscoveryLocationAgeEligible(null, now)).toBe(false)
    expect(isFriendDiscoveryLocationAgeEligible('not-a-date', now)).toBe(false)
  })
})

describe('toFriendDiscoveryCell', () => {
  it('rounds a GPS fix down into a coarse cell', () => {
    expect(toFriendDiscoveryCell({ lat: 13.7301, lng: 100.5412 })).toEqual({
      cellLat: Math.floor(13.7301 / FRIEND_DISCOVERY_CELL_DEGREES),
      cellLng: Math.floor(100.5412 / FRIEND_DISCOVERY_CELL_DEGREES),
    })
  })

  it('keeps negative coordinates deterministic', () => {
    expect(toFriendDiscoveryCell({ lat: -0.001, lng: -0.001 })).toEqual({
      cellLat: -1,
      cellLng: -1,
    })
  })

  it('rejects invalid coordinates before they reach the repository', () => {
    expect(() => toFriendDiscoveryCell({ lat: 91, lng: 100 })).toThrow('location_invalid')
    expect(() => toFriendDiscoveryCell({ lat: 13, lng: Number.NaN })).toThrow('location_invalid')
  })
})
