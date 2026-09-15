import { supabase } from '@/lib/supabase'
import type {
  CreateActivityMemoryRecordInput,
  CreateActivityMemoryResult,
} from './activityMemoryTypes'

export async function createActivityMemoryRecord(
  input: CreateActivityMemoryRecordInput,
): Promise<CreateActivityMemoryResult> {
  const { data, error } = await supabase
    .functions
    .invoke<CreateActivityMemoryResult>('create-activity-memory', {
      body: {
        activityType: input.activityType,
        title: input.title ?? null,
        notes: input.notes ?? null,
        locationName: input.locationName ?? null,
        startedAt: input.startedAt,
        durationSeconds: input.durationSeconds ?? null,
        perceivedEffort: input.perceivedEffort ?? null,
        moodAfter: input.moodAfter ?? null,
        mediaPaths: input.mediaPaths ?? [],
        data: input.data,
      },
    })

  if (error) throw error
  if (!data) throw new Error('create-activity-memory returned no data')
  return data
}
