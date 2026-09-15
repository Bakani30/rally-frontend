export type HealthWorkoutIdentity = {
  id: string
  source: 'healthkit' | 'health_connect'
}

export function healthWorkoutDedupeKey(item: HealthWorkoutIdentity): string {
  return `${item.source}:${item.id}`
}
