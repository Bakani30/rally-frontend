import type { MatchSubmission } from '../../types/match'

export function getCurrentMatchSubmission(match: {
  match_submissions?: MatchSubmission[] | null
}): MatchSubmission | null {
  const submissions = match.match_submissions ?? []
  return submissions.reduce<MatchSubmission | null>((latest, submission) => {
    if (!latest) return submission
    return Date.parse(submission.created_at) > Date.parse(latest.created_at)
      ? submission
      : latest
  }, null)
}
