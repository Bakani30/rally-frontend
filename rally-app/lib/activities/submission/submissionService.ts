import { submitActivityRecord } from './submissionRepository'
import type {
  ContributionEntry,
  RunningSubmissionData,
  SubmissionActivityType,
  SubmissionInput,
  SubmissionResult,
  TeamSportSubmissionData,
} from './submissionTypes'

const TEAM_SPORTS: SubmissionActivityType[] = ['basketball', 'badminton']

function validateContributions(entries: ContributionEntry[] | undefined) {
  if (!entries || entries.length === 0) return
  const seen = new Set<string>()
  for (const c of entries) {
    if (!c.user_id) throw new Error('Contribution user_id is required')
    if (seen.has(c.user_id)) throw new Error('Duplicate contribution for same user')
    seen.add(c.user_id)
    if (!Number.isInteger(c.points) || c.points < 0) throw new Error('Contribution points must be ≥ 0')
  }
}

function contributionTotal(entries: ContributionEntry[] | undefined) {
  return (entries ?? []).reduce((total, entry) => total + entry.points, 0)
}

export function submitActivity(input: SubmissionInput): Promise<SubmissionResult> {
  if (input.activityType === 'running') {
    const data = input.data as RunningSubmissionData
    if (input.activitySessionId) {
      if (!input.activitySessionId.trim()) {
        throw new Error('Pick a recorded run session')
      }
    } else {
      if (!Number.isInteger(data.distance_meters) || data.distance_meters <= 0) {
        throw new Error('Distance must be a positive whole number of meters')
      }
      if (!Number.isInteger(data.moving_time_seconds) || data.moving_time_seconds <= 0) {
        throw new Error('Moving time must be a positive number of seconds')
      }
    }
    if (!input.activitySessionId && !input.isTie && !input.claimedWinnerUserId) {
      throw new Error('Pick a winner or mark the match as a tie')
    }
  } else if (TEAM_SPORTS.includes(input.activityType)) {
    const data = input.data as TeamSportSubmissionData
    if (data.side_index !== 0 && data.side_index !== 1) {
      throw new Error('Team side is required')
    }
    if (!Number.isInteger(data.team_score) || data.team_score < 0) {
      throw new Error('Your team score must be 0 or a positive whole number')
    }
    if (!input.contributions || input.contributions.length === 0) {
      throw new Error('Player contributions are required for team scores')
    }
    validateContributions(input.contributions)
    const total = contributionTotal(input.contributions)
    if (total !== data.team_score) {
      throw new Error(`Player contributions (${total}) must equal your team score (${data.team_score})`)
    }
  } else {
    throw new Error(`Unsupported activity type: ${input.activityType}`)
  }

  if (!TEAM_SPORTS.includes(input.activityType)) {
    validateContributions(input.contributions)
  }

  return submitActivityRecord(input)
}
