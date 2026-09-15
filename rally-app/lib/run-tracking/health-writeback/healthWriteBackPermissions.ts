export const HEALTHKIT_WRITE_TYPES = [
  'HKWorkoutTypeIdentifier',
  'HKWorkoutRouteTypeIdentifier',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const

export const HEALTH_CONNECT_WRITE_PERMISSIONS = [
  { accessType: 'write' as const, recordType: 'ExerciseSession' as const },
  { accessType: 'write' as const, recordType: 'Distance' as const },
  { accessType: 'write' as const, recordType: 'ExerciseRoute' as const },
] as const

type HealthConnectPermission = {
  accessType: 'read' | 'write'
  recordType: string
}

export function hasAllHealthConnectWritePermissions(
  granted: readonly HealthConnectPermission[],
): boolean {
  return HEALTH_CONNECT_WRITE_PERMISSIONS.every((required) =>
    granted.some((permission) =>
      permission.accessType === required.accessType &&
      permission.recordType === required.recordType
    )
  )
}
