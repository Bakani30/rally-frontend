import type {
  HealthWriteBackPermissionRequester,
  HealthWriteBackPlatform,
  HealthWriteBackRecord,
  HealthWriteBackStore,
  HealthWriteBackWriter,
  SaveRunToHealthInput,
} from './healthWriteBackTypes'
import { validRoutePoints } from './healthWriteBackRoute'

export type SaveRunToHealthDependencies = {
  platform: HealthWriteBackPlatform
  store: HealthWriteBackStore
  requestPermission: HealthWriteBackPermissionRequester
  writer: HealthWriteBackWriter
  now?: () => Date
}

export async function saveRunToHealth(
  input: SaveRunToHealthInput,
  dependencies: SaveRunToHealthDependencies,
): Promise<HealthWriteBackRecord> {
  const now = dependencies.now ?? (() => new Date())
  const existing = await dependencies.store.getStatus(input.activitySessionId)
  if (existing?.status === 'saved') return existing

  if (!isRunEligibleForHealthWriteBack(input)) {
    return persistRecord(dependencies.store, {
      activitySessionId: input.activitySessionId,
      status: 'skipped',
      platform: dependencies.platform,
      recordId: null,
      errorMessage: 'Only server-confirmed Rally GPS running sessions with route data can be saved.',
      updatedAt: now().toISOString(),
    })
  }

  await dependencies.store.setStatus({
    activitySessionId: input.activitySessionId,
    status: 'pending',
    platform: dependencies.platform,
    recordId: existing?.recordId ?? null,
    errorMessage: null,
    updatedAt: now().toISOString(),
  })

  const permissionStatus = await dependencies.requestPermission(dependencies.platform)
  if (permissionStatus !== 'granted') {
    return persistRecord(dependencies.store, {
      activitySessionId: input.activitySessionId,
      status: 'skipped',
      platform: dependencies.platform,
      recordId: null,
      errorMessage: 'Health write permission was not granted.',
      updatedAt: now().toISOString(),
    })
  }

  try {
    const result = await dependencies.writer.save(input)
    return persistRecord(dependencies.store, {
      activitySessionId: input.activitySessionId,
      status: 'saved',
      platform: dependencies.platform,
      recordId: result.recordId,
      errorMessage: null,
      updatedAt: now().toISOString(),
    })
  } catch (err) {
    return persistRecord(dependencies.store, {
      activitySessionId: input.activitySessionId,
      status: 'failed',
      platform: dependencies.platform,
      recordId: null,
      errorMessage: readErrorMessage(err),
      updatedAt: now().toISOString(),
    })
  }
}

export function isRunEligibleForHealthWriteBack(input: SaveRunToHealthInput): boolean {
  return (
    input.serverConfirmed === true &&
    input.source === 'gps_live' &&
    input.activityType === 'running' &&
    input.distanceMeters > 0 &&
    input.durationSeconds > 0 &&
    input.endedAt > input.startedAt &&
    validRoutePoints(input.path).length >= 2
  )
}

async function persistRecord(
  store: HealthWriteBackStore,
  record: HealthWriteBackRecord,
): Promise<HealthWriteBackRecord> {
  await store.setStatus(record)
  return record
}

function readErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return 'Unable to save this run to the health store.'
}
