import { Platform } from 'react-native'
import type { HrSample } from '@/lib/health/profileMetrics'

export type WorkoutWindow = { start: Date; end: Date }
export type WorkoutBodySamples = { hrSamples: HrSample[]; steps: number | null }

export async function readWorkoutBodySamples(window: WorkoutWindow): Promise<WorkoutBodySamples> {
  if (Platform.OS === 'ios') {
    const { readIosWorkoutBodySamples } = await import('./iosWorkoutBodySamples')
    return readIosWorkoutBodySamples(window)
  }
  if (Platform.OS === 'android') {
    const { readAndroidWorkoutBodySamples } = await import('./androidWorkoutBodySamples')
    return readAndroidWorkoutBodySamples(window)
  }
  return { hrSamples: [], steps: null }
}
