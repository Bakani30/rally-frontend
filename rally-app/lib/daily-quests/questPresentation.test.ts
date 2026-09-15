import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: {
    select: (options: Record<string, unknown>) =>
      options.default ?? options.ios ?? options.android ?? options.web,
  },
}))

describe('questAccentColor', () => {
  it('maps each activity to its ActivityColor and special to the indigo accent', async () => {
    const { questAccentColor } = await import('./questPresentation')
    const { ActivityColor, RallyAccent } = await import('@/constants/theme')
    expect(questAccentColor('running')).toBe(ActivityColor.running)
    expect(questAccentColor('basketball')).toBe(ActivityColor.basketball)
    expect(questAccentColor('badminton')).toBe(ActivityColor.badminton)
    expect(questAccentColor('special')).toBe(RallyAccent.indigo)
  })
})

describe('questTypeLabel', () => {
  it('maps evidence modes to short uppercase labels', async () => {
    const { questTypeLabel } = await import('./questPresentation')
    expect(questTypeLabel('sensor_sync')).toBe('SYNC')
    expect(questTypeLabel('timed_sensor_session')).toBe('TIMED')
    expect(questTypeLabel('video_proof')).toBe('VIDEO PROOF')
    expect(questTypeLabel('manual_proof')).toBe('MANUAL')
  })
})
