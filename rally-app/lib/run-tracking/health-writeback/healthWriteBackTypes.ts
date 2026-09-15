import type { GpsPoint } from '../gps/gpsTypes'
import type { HealthAuthorizationStatus } from '../permissions/healthPermissions'

export type HealthWriteBackStatus =
  | 'not_requested'
  | 'pending'
  | 'saved'
  | 'skipped'
  | 'failed'

export type HealthWriteBackPreference =
  | 'ask_each_time'
  | 'always_save'
  | 'never_save'

export type HealthWriteBackPlatform = 'ios' | 'android'

export type SaveRunToHealthInput = {
  activitySessionId: string
  source: 'gps_live'
  activityType: 'running'
  startedAt: Date
  endedAt: Date
  durationSeconds: number
  distanceMeters: number
  path: GpsPoint[]
  title?: string | null
  serverConfirmed: true
}

export type HealthWriteBackRecord = {
  activitySessionId: string
  status: HealthWriteBackStatus
  platform: HealthWriteBackPlatform | null
  recordId: string | null
  errorMessage: string | null
  updatedAt: string
}

export type HealthWriteBackStore = {
  getStatus: (activitySessionId: string) => Promise<HealthWriteBackRecord | null>
  setStatus: (record: HealthWriteBackRecord) => Promise<void>
}

export type HealthWriteBackWriterResult = {
  recordId: string
}

export type HealthWriteBackWriter = {
  save: (input: SaveRunToHealthInput) => Promise<HealthWriteBackWriterResult>
}

export type HealthWriteBackPermissionRequester = (
  platform: HealthWriteBackPlatform,
) => Promise<HealthAuthorizationStatus>
