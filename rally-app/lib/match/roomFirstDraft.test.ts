import { describe, expect, it } from 'vitest'

import {
  describeQuickMatchPreset,
  getRoomFirstDefaultDraft,
  getRoomFirstDraftStorageKey,
  isFlexibleTeamStartActivity,
  normalizeRoomFirstDraft,
  parseQuickMatchPreset,
  type QuickMatchPreset,
} from './roomFirstDraft'

describe('room first draft defaults', () => {
  it('starts new users from fast public presets per sport', () => {
    expect(getRoomFirstDefaultDraft('running', 50)).toMatchObject({
      runningMode: 'race',
      runningResultMode: 'sensor_pace_5k',
      teamSize: 1,
      lobbyMode: 'public',
      stake: 50,
    })
    expect(getRoomFirstDefaultDraft('basketball', 50)).toMatchObject({
      teamSize: 3,
      lobbyMode: 'public',
    })
    expect(getRoomFirstDefaultDraft('badminton', 50)).toMatchObject({
      teamSize: 1,
      lobbyMode: 'public',
    })
  })

  it('normalizes last-used values against the selected sport options', () => {
    expect(normalizeRoomFirstDraft('basketball', {
      teamSize: 2,
      lobbyMode: 'open',
      stake: 4,
      legacyStakeCurrency: 'credit',
    }, 50)).toMatchObject({
      teamSize: 3,
      lobbyMode: 'public',
      stake: 10,
    })

    expect(normalizeRoomFirstDraft('badminton', {
      teamSize: 2,
      lobbyMode: 'public',
      stake: '70',
    }, 50)).toMatchObject({
      teamSize: 2,
      lobbyMode: 'public',
      stake: 70,
    })
  })

  it('keeps group running sizes separate from team-sport capacity', () => {
    expect(normalizeRoomFirstDraft('running', {
      runningMode: 'coop',
      runningGroupSize: 5,
      teamSize: 1,
    }, 50)).toMatchObject({
      runningMode: 'coop',
      runningGroupSize: 5,
      teamSize: 5,
    })
  })

  it('keeps race running 1v1 until team aggregate scoring exists', () => {
    expect(normalizeRoomFirstDraft('running', {
      runningMode: 'race',
      teamSize: 4,
    }, 50)).toMatchObject({
      runningMode: 'race',
      teamSize: 1,
    })
  })

  it('migrates the legacy 5K pace draft key', () => {
    expect(normalizeRoomFirstDraft('running', {
      runningMode: 'race',
      runningResultMode: 'sensor_5k_pace',
    }, 50)).toMatchObject({
      runningResultMode: 'sensor_pace_5k',
    })
  })

  it('normalizes FFA running to a 3-8 person pool', () => {
    expect(normalizeRoomFirstDraft('running', {
      runningMode: 'ffa',
      runningGroupSize: 2,
      teamSize: 1,
    }, 50)).toMatchObject({
      runningMode: 'ffa',
      runningGroupSize: 3,
      teamSize: 3,
    })

    expect(normalizeRoomFirstDraft('running', {
      runningMode: 'ffa',
      runningGroupSize: 9,
      teamSize: 1,
    }, 50)).toMatchObject({
      runningMode: 'ffa',
      runningGroupSize: 8,
      teamSize: 8,
    })
  })

  it('stores last-used presets per sport and scopes flexible start to team sports', () => {
    expect(getRoomFirstDraftStorageKey('running')).toBe('rally.match.roomFirstDraft.v2.running')
    expect(getRoomFirstDraftStorageKey('basketball')).toBe('rally.match.roomFirstDraft.v2.basketball')
    expect(isFlexibleTeamStartActivity('running')).toBe(false)
    expect(isFlexibleTeamStartActivity('basketball')).toBe(true)
    expect(isFlexibleTeamStartActivity('badminton')).toBe(true)
  })
})

describe('parseQuickMatchPreset', () => {
  it('parses a stored basketball draft into a preset, defaulting allowSpectators to false', () => {
    expect(parseQuickMatchPreset(JSON.stringify({
      teamSize: 3,
      stake: 50,
      lobbyMode: 'public',
      isLocked: false,
    }))).toEqual({
      teamSize: 3,
      stake: 50,
      lobbyMode: 'public',
      isLocked: false,
      allowSpectators: false,
    })
  })

  it('carries allowSpectators when the stored draft has it on', () => {
    expect(parseQuickMatchPreset(JSON.stringify({
      teamSize: 5,
      stake: 20,
      lobbyMode: 'public',
      isLocked: false,
      allowSpectators: true,
    }))).toMatchObject({ allowSpectators: true })
  })

  it('clamps a stake below MIN_STAKE up to MIN_STAKE', () => {
    expect(parseQuickMatchPreset(JSON.stringify({
      teamSize: 3,
      stake: 1,
      lobbyMode: 'public',
      isLocked: false,
    }))).toMatchObject({ stake: 10 })
  })

  it('returns null for missing, malformed, or structurally invalid drafts', () => {
    expect(parseQuickMatchPreset(null)).toBeNull()
    expect(parseQuickMatchPreset('not json')).toBeNull()
    expect(parseQuickMatchPreset(JSON.stringify({ foo: 'bar' }))).toBeNull()
    expect(parseQuickMatchPreset(JSON.stringify({ teamSize: 4, stake: 50 }))).toBeNull()
  })
})

describe('describeQuickMatchPreset', () => {
  it('describes team size, stake, and the live suffix when spectating is on', () => {
    const preset: QuickMatchPreset = {
      teamSize: 3,
      stake: 50,
      lobbyMode: 'public',
      isLocked: false,
      allowSpectators: true,
    }
    expect(describeQuickMatchPreset(preset)).toBe('บาส 3V3 · 50 PTS · เปิดดูสด')
  })

  it('omits the live suffix when spectating is off', () => {
    const preset: QuickMatchPreset = {
      teamSize: 5,
      stake: 20,
      lobbyMode: 'public',
      isLocked: false,
      allowSpectators: false,
    }
    expect(describeQuickMatchPreset(preset)).toBe('บาส 5V5 · 20 PTS')
  })

  it('appends the private suffix when the preset is a locked public lobby', () => {
    const preset: QuickMatchPreset = {
      teamSize: 3,
      stake: 50,
      lobbyMode: 'public',
      isLocked: true,
      allowSpectators: true,
    }
    expect(describeQuickMatchPreset(preset)).toBe('บาส 3V3 · 50 PTS · ส่วนตัว · เปิดดูสด')
  })

  it('omits the private suffix for an unlocked open public lobby', () => {
    const preset: QuickMatchPreset = {
      teamSize: 3,
      stake: 50,
      lobbyMode: 'public',
      isLocked: false,
      allowSpectators: false,
    }
    expect(describeQuickMatchPreset(preset)).toBe('บาส 3V3 · 50 PTS')
  })
})
