import { describe, expect, it } from 'vitest'
import {
  getRecordedResultActivityHref,
  shouldOpenCoachStartInput,
} from './coachActivityNavigation'

describe('getRecordedResultActivityHref', () => {
  it('starts coach setup when opening a basketball activity from the match box score', () => {
    expect(getRecordedResultActivityHref({ id: 'activity-1', activity_type: 'basketball' })).toBe(
      '/activity/activity-1?coach=setup',
    )
  })

  it('keeps non-basketball activities on the normal activity detail route', () => {
    expect(getRecordedResultActivityHref({ id: 'activity-2', activity_type: 'running' })).toBe(
      '/activity/activity-2',
    )
  })
})

describe('shouldOpenCoachStartInput', () => {
  it('opens the coach input only for basketball activities with setup intent', () => {
    expect(shouldOpenCoachStartInput({ activityType: 'basketball', coachParam: 'setup' })).toBe(true)
    expect(shouldOpenCoachStartInput({ activityType: 'basketball', coachParam: ['setup'] })).toBe(true)
    expect(shouldOpenCoachStartInput({ activityType: 'basketball', coachParam: undefined })).toBe(false)
    expect(shouldOpenCoachStartInput({ activityType: 'running', coachParam: 'setup' })).toBe(false)
  })
})
