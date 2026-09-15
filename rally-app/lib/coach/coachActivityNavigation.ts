type ActivityLike = {
  id: string
  activity_type: string
}

export type RecordedResultActivityHref =
  | `/activity/${string}`
  | `/activity/${string}?coach=setup`

export function getRecordedResultActivityHref(activity: ActivityLike): RecordedResultActivityHref {
  if (activity.activity_type === 'basketball') {
    return `/activity/${activity.id}?coach=setup`
  }
  return `/activity/${activity.id}`
}

export function shouldOpenCoachStartInput(input: {
  activityType: string | null | undefined
  coachParam: string | string[] | null | undefined
}): boolean {
  if (input.activityType !== 'basketball') return false
  const intent = Array.isArray(input.coachParam) ? input.coachParam[0] : input.coachParam
  return intent === 'setup'
}
