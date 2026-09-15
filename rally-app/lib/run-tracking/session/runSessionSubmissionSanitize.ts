import type { Split } from '../gps/gpsTypes'

const MIN_SERVER_SPLIT_PACE_SECONDS = 150
const MAX_SERVER_SPLIT_PACE_SECONDS = 900

export function sanitizeSplitsForRunSubmission(splits?: readonly Split[]): Split[] | undefined {
  if (!splits) return undefined
  const valid = splits.filter((split) =>
    Number.isInteger(split.km) &&
    split.km >= 1 &&
    Number.isInteger(split.timeSeconds) &&
    split.timeSeconds >= 0 &&
    Number.isInteger(split.paceSecondsPerKm) &&
    split.paceSecondsPerKm >= MIN_SERVER_SPLIT_PACE_SECONDS &&
    split.paceSecondsPerKm <= MAX_SERVER_SPLIT_PACE_SECONDS
  )
  return valid.length > 0 ? valid : undefined
}
