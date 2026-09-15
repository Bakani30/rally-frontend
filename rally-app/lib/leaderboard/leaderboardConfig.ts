import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityColor } from '@/constants/theme'

export type LeaderboardActivity = 'running' | 'basketball' | 'badminton'
// Retired the 'overall' account-wide leaderboard category (founder-approved).
// Ranking is per sport only; the account Rally Score is shown as a plain number
// on Home / public profile, not as a competitive leaderboard.
export type LeaderboardCategory = LeaderboardActivity

export type LeaderboardScope = 'global' | 'friends'

export const LEADERBOARD_SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'global', label: 'GLOBAL' },
  { key: 'friends', label: 'FRIENDS' },
]

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export const LEADERBOARD_ACTIVITIES: {
  key: LeaderboardActivity
  label: string
  icon: IconName
  color: string
}[] = [
  // Colors follow the profile/activity identity (ActivityColor): basketball
  // orange, running lime, badminton teal. Single source of truth in theme.ts
  // so these stay aligned with court/profile/live-score accents.
  { key: 'basketball', label: 'BASKETBALL', icon: 'basketball', color: ActivityColor.basketball },
  { key: 'running', label: 'RUNNING', icon: 'run-fast', color: ActivityColor.running },
  { key: 'badminton', label: 'BADMINTON', icon: 'badminton', color: ActivityColor.badminton },
]

export const LEADERBOARD_CATEGORIES: {
  key: LeaderboardCategory
  label: string
  icon: IconName
  color: string
}[] = [
  ...LEADERBOARD_ACTIVITIES,
]

// Min DECISIVE matches (wins + losses; ties/coop excluded) required to qualify
// for a sport leaderboard. Must match LEADERBOARD_MIN_MATCHES in the
// list-leaderboard edge function (supabase/functions/list-leaderboard/service.ts),
// which is the authoritative gate.
export const LEADERBOARD_MIN_MATCHES = 5

export const LEADERBOARD_TOP_N = 50
