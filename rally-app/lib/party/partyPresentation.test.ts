import { describe, expect, it } from 'vitest'
import {
  formatPartyExpiry,
  formatPartyTeamSize,
  getActivePartyMembers,
  getPartyActivityLabel,
  getPartyViewerState,
  PARTY_TEAM_SIZES,
} from './partyPresentation'

describe('partyPresentation', () => {
  it('keeps the supported team sizes and labels stable', () => {
    expect(PARTY_TEAM_SIZES).toEqual([1, 2, 3, 5])
    expect(formatPartyTeamSize(3)).toBe('3v3')
    expect(getPartyActivityLabel('basketball')).toBe('Basketball')
    expect(getPartyActivityLabel('badminton')).toBe('Badminton')
  })

  it('formats expiry relative to the current time', () => {
    const now = new Date('2026-08-02T10:00:00.000Z')
    expect(formatPartyExpiry('2026-08-02T10:30:00.000Z', now)).toBe('Ends in less than 1h')
    expect(formatPartyExpiry('2026-08-02T13:00:00.000Z', now)).toBe('Ends in 3h')
    expect(formatPartyExpiry('2026-08-02T09:00:00.000Z', now)).toBe('Expired')
  })

  it('selects only active members and preserves viewer authority states', () => {
    const party = {
      id: 'party-1',
      name: 'Saturday Crew',
      activity_type: 'basketball' as const,
      team_size: 3 as const,
      visibility: 'discoverable' as const,
      status: 'forming' as const,
      host_user_id: 'user-host',
      created_by: 'user-host',
      expires_at: '2026-08-02T22:00:00.000Z',
      created_at: '2026-08-02T10:00:00.000Z',
      closed_at: null,
      expired_at: null,
      updated_at: '2026-08-02T10:00:00.000Z',
      party_members: [
        { user_id: 'user-host', status: 'active' },
        { user_id: 'user-requested', status: 'requested' },
      ],
    } as never

    expect(getActivePartyMembers(party)).toHaveLength(1)
    expect(getPartyViewerState(party, 'user-host')).toBe('host')
    expect(getPartyViewerState(party, 'user-requested')).toBe('requested')
    expect(getPartyViewerState(party, 'user-other')).toBe('visitor')
  })

  it('uses the current host instead of the original creator after a transfer', () => {
    const party = {
      host_user_id: 'user-new-host',
      created_by: 'user-original-creator',
      party_members: [],
    } as never

    expect(getPartyViewerState(party, 'user-new-host')).toBe('host')
    expect(getPartyViewerState(party, 'user-original-creator')).toBe('visitor')
  })
})
