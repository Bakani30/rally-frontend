export type SubmissionActivityType = 'running' | 'basketball' | 'badminton'

export type RunningSubmissionData = {
  distance_meters: number
  moving_time_seconds: number
}

export type TeamSportSubmissionData = {
  side_index: 0 | 1
  team_score: number
}

export type ContributionEntry = {
  user_id: string
  points: number
  note?: string | null
}

export type SubmissionInput = {
  matchId: string
  activityType: SubmissionActivityType
  data: RunningSubmissionData | TeamSportSubmissionData
  activitySessionId?: string | null
  mediaPaths?: string[]
  claimedWinnerUserId?: string | null
  isTie?: boolean
  notes?: string | null
  contributions?: ContributionEntry[]
}

export type SubmissionResult = {
  activitySessionId: string | null
  submissionId: string | null
  winnerUserId: string | null
  isTie: boolean
  teamResultSubmission?: {
    id: string
    sideIndex: 0 | 1
    submittedBy: string
    teamScore: number
  }
  pendingSubmissions?: { submitted: number; required: number }
}
