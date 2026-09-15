import { describe, expect, it } from 'vitest'
import { sanitizeSplitsForRunSubmission } from './runSessionSubmissionSanitize'

describe('sanitizeSplitsForRunSubmission', () => {
  it('drops splits that would make the edge request body invalid', () => {
    const sanitized = sanitizeSplitsForRunSubmission([
      { km: 1, timeSeconds: 1311, paceSecondsPerKm: 1311 },
      { km: 2, timeSeconds: 1711, paceSecondsPerKm: 400 },
    ])

    expect(sanitized).toEqual([
      { km: 2, timeSeconds: 1711, paceSecondsPerKm: 400 },
    ])
  })

  it('omits splits when every split is outside the current server contract', () => {
    expect(sanitizeSplitsForRunSubmission([
      { km: 1, timeSeconds: 1311, paceSecondsPerKm: 1311 },
    ])).toBeUndefined()
  })
})
