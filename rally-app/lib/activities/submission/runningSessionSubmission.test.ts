import { describe, expect, it } from 'vitest'

import { buildRunningSubmissionDataFromSession } from './runningSessionSubmission'

describe('running session submission data', () => {
  it('derives moving time from server distance and pace', () => {
    expect(buildRunningSubmissionDataFromSession({
      serverDistanceMeters: 5000,
      serverPaceSecondsPerKm: 300,
    })).toEqual({
      distance_meters: 5000,
      moving_time_seconds: 1500,
    })
  })

  it('keeps submit-activity schema-positive fallbacks for missing metrics', () => {
    expect(buildRunningSubmissionDataFromSession({})).toEqual({
      distance_meters: 1,
      moving_time_seconds: 1,
    })
  })
})
