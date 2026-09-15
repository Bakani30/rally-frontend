import {
  getProfileSummary,
  getPublicProfile as fetchPublicProfile,
  getUserProfile,
  getUserStats,
  runDailyCheckin,
  updateJerseyNumber,
  type DailyCheckinResult,
  type ProfileSummary,
  type PublicProfile,
  type UserProfile,
  type UserStats,
} from './profileRepository'
import { bangkokDate, effectiveStreakDays } from './profileStreak'

export type { PublicProfile } from './profileRepository'

export function getPublicProfileView(input: {
  userId?: string
  handle?: string
}): Promise<PublicProfile> {
  return fetchPublicProfile(input)
}

export function getHomeProfile(userId: string): Promise<ProfileSummary | null> {
  return getProfileSummary(userId).then((profile) => profile
    ? {
        ...profile,
        current_streak: effectiveStreakDays(profile.current_streak, profile.last_checkin_date),
      }
    : null)
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const profile = await getUserProfile(userId)
  if (!profile.last_checkin_date) return profile
  return {
    ...profile,
    current_streak: effectiveStreakDays(profile.current_streak, profile.last_checkin_date),
  }
}

export function getStats(userId: string): Promise<UserStats | null> {
  return getUserStats(userId)
}

export function dailyCheckin(userId: string): Promise<DailyCheckinResult> {
  return runDailyCheckin(userId)
}

export function setJerseyNumber(value: number): Promise<number> {
  return updateJerseyNumber(value)
}

export function todayLocalDate(): string {
  return bangkokDate()
}

export function hasCheckedInToday(lastCheckinDate: string | null | undefined): boolean {
  return lastCheckinDate === todayLocalDate()
}
