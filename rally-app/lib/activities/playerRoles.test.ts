import { describe, expect, it } from 'vitest'
import { activityRoleConfig, roleShort } from './playerRoles'

describe('roleShort', () => {
  it('maps known keys per activity to the right abbreviation', () => {
    expect(roleShort('basketball', 'pg')).toBe('PG')
    expect(roleShort('running', 'marathon')).toBe('MAR')
    expect(roleShort('badminton', 'front')).toBe('FRT')
  })

  it('does not cross activities (a running key is invalid for badminton)', () => {
    expect(roleShort('badminton', 'marathon')).toBeNull()
  })

  it('returns null for unset/unknown keys and activities', () => {
    expect(roleShort('running', null)).toBeNull()
    expect(roleShort('running', 'nope')).toBeNull()
    expect(roleShort('chess', 'pg')).toBeNull()
  })
})

describe('activityRoleConfig', () => {
  it('exposes the corrected running styles and badminton positions', () => {
    expect(activityRoleConfig('running')?.roles.map((role) => role.key)).toEqual([
      'marathon', 'trail', 'track', 'fun_run', 'race',
    ])
    expect(activityRoleConfig('badminton')?.roles.map((role) => role.key)).toEqual([
      'front', 'rear', 'defense', 'rotation',
    ])
  })

  it('uses POSITION for basketball and badminton, and STYLE for running', () => {
    expect(activityRoleConfig('basketball')?.cellLabel).toBe('POSITION')
    expect(activityRoleConfig('badminton')?.cellLabel).toBe('POSITION')
    expect(activityRoleConfig('running')?.cellLabel).toBe('STYLE')
  })

  it('uses position-oriented Thai copy for the badminton picker', () => {
    expect(activityRoleConfig('badminton')?.pickerTitle).toBe('ตำแหน่งที่ชอบเล่น')
  })

  it('returns null for activities without a role picker', () => {
    expect(activityRoleConfig('chess')).toBeNull()
  })
})
