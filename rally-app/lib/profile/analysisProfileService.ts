import {
  getAnalysisProfile,
  updateAnalysisProfile,
} from './analysisProfileRepository'
import type { AnalysisProfile, UpdateAnalysisProfileInput } from './analysisProfileTypes'

export type { AnalysisProfile, UpdateAnalysisProfileInput } from './analysisProfileTypes'

export function getUserAnalysisProfile(): Promise<AnalysisProfile> {
  return getAnalysisProfile()
}

export function saveUserAnalysisProfile(
  input: UpdateAnalysisProfileInput,
): Promise<AnalysisProfile> {
  return updateAnalysisProfile(input)
}
