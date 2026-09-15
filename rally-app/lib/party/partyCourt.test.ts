import { describe, expect, it } from 'vitest'
import { buildPartyCourtLayout } from './partyCourt'

const roster = Array.from({ length: 5 }, (_, index) => ({
  userId: `user-${index + 1}`,
  displayName: `Player ${index + 1}`,
  handle: `player${index + 1}`,
  avatarUrl: null,
}))

describe('partyCourt', () => {
  it.each([1, 2, 3, 5] as const)('renders exactly %dv%d slots', (teamSize) => {
    const layout = buildPartyCourtLayout('basketball', teamSize, roster.slice(0, teamSize))

    expect(layout.slots).toHaveLength(teamSize)
    expect(layout.slots.filter((slot) => slot.member)).toHaveLength(teamSize)
    expect(layout.bench).toHaveLength(0)
  })

  it('keeps extra active members on the bench, capped at five total active members', () => {
    const layout = buildPartyCourtLayout('badminton', 2, roster)

    expect(layout.slots).toHaveLength(2)
    expect(layout.bench.map((member) => member.userId)).toEqual(['user-3', 'user-4', 'user-5'])
  })

  it('leaves empty slots available without making position a stored member attribute', () => {
    const layout = buildPartyCourtLayout('basketball', 3, roster.slice(0, 1))

    expect(layout.slots.filter((slot) => slot.member)).toHaveLength(1)
    expect(layout.slots.filter((slot) => !slot.member)).toHaveLength(2)
    expect(layout.slots.every((slot) => slot.positionKey.startsWith('slot-'))).toBe(true)
  })
})
