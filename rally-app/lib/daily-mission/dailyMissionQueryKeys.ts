// TanStack Query keys for daily-mission data. Mirrors lib/profile/profileQueryKeys.ts.
// `today` holds the latest sync result so read-only consumers (e.g. the quest hub
// done-count) can observe it without re-firing the sync mutation.
export const dailyMissionQueryKeys = {
  all: ['daily-mission'] as const,
  today: (userId: string | undefined) => ['daily-mission', 'today', userId] as const,
}
