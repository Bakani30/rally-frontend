// Referee trust-tier ladder — display + progress helpers.
//
// SOURCE OF TRUTH: this mirrors the SQL functions `referee_level_for` and
// `referee_trust_tier_for` in
// supabase/migrations/20260612090000_referee_trust_player_score_drafts.sql.
// The server is authoritative for actual progression; this config is for UI
// (the level ladder + "where am I" highlight). Keep thresholds in sync with SQL.

import type { RefereeSportProfile, RefereeTrustTier } from '@/types/match'

// Accent maps to a SportPalette color family resolved by the component layer,
// so this module stays UI-framework agnostic.
export type RefereeTierAccent = 'muted' | 'blue' | 'green' | 'amber' | 'orange'

export type RefereeTierMeta = {
  key: RefereeTrustTier
  level: number
  label: string
  blurb: string
  accent: RefereeTierAccent
  // Minimum stats to REACH this tier (floor). candidate has no requirement.
  requirement: {
    completedMatches: number
    rating: number
    trustScore: number
  }
}

// Ordered low → high. Levels 0..4.
export const REFEREE_TIERS: RefereeTierMeta[] = [
  {
    key: 'candidate',
    level: 0,
    label: 'ผู้สมัคร',
    blurb: 'สมัครแล้ว เริ่มจากการตัดสินแมตช์แรก',
    accent: 'muted',
    requirement: { completedMatches: 0, rating: 0, trustScore: 0 },
  },
  {
    key: 'court_side',
    level: 1,
    label: 'หน้าใหม่',
    blurb: 'พร้อมช่วยตัดสินแมตช์ทั่วไป',
    accent: 'blue',
    requirement: { completedMatches: 1, rating: 0, trustScore: 0 },
  },
  {
    key: 'community',
    level: 2,
    label: 'มีประสบการณ์',
    blurb: 'ตัดสินได้สม่ำเสมอและไร้ข้อโต้แย้ง',
    accent: 'green',
    requirement: { completedMatches: 5, rating: 3.8, trustScore: 200 },
  },
  {
    key: 'official_ready',
    level: 3,
    label: 'น่าเชื่อถือสูง',
    blurb: 'ได้รับความไว้วางใจจากหลายแมตช์',
    accent: 'amber',
    requirement: { completedMatches: 15, rating: 4.5, trustScore: 550 },
  },
  {
    key: 'event_lead',
    level: 4,
    label: 'หัวหน้ากรรมการ',
    blurb: 'พร้อมนำหน้าที่กรรมการในอีเวนต์',
    accent: 'orange',
    requirement: { completedMatches: 40, rating: 4.7, trustScore: 850 },
  },
]

// Referee scope is fixed to these three activities in alpha. Trust profiles
// (level/rating) only exist for basketball + badminton; running is manual-only.
export const REFEREE_ACTIVITY_KEYS = ['basketball', 'badminton', 'running'] as const
export type RefereeActivityKey = (typeof REFEREE_ACTIVITY_KEYS)[number]

export function refereeSupportsTrust(key: RefereeActivityKey): boolean {
  return key === 'basketball' || key === 'badminton'
}

const TIER_BY_KEY = new Map(REFEREE_TIERS.map((tier) => [tier.key, tier]))
const TIER_BY_LEVEL = new Map(REFEREE_TIERS.map((tier) => [tier.level, tier]))

export function refereeTierMeta(key: RefereeTrustTier): RefereeTierMeta {
  return TIER_BY_KEY.get(key) ?? REFEREE_TIERS[0]
}

export function refereeTierByLevel(level: number): RefereeTierMeta {
  return TIER_BY_LEVEL.get(level) ?? REFEREE_TIERS[0]
}

// A direct Rally appointment unlocks the assigned level immediately. Earned
// history still wins when it is higher, and malformed inputs cannot escape the
// public 0..4 display ladder.
export function resolveRefereeDisplayLevel(
  earnedLevel: number,
  appointedLevels: readonly (number | null | undefined)[] = [],
): number {
  const validLevels = [earnedLevel, ...appointedLevels]
    .filter((level): level is number => Number.isFinite(level))
    .map((level) => Math.trunc(level))

  return Math.min(4, Math.max(0, ...validLevels))
}

// Pure mirror of SQL `referee_level_for`. Returns 0..4.
export function refereeLevelForStats(
  completedMatches: number,
  rating: number,
  trustScore: number,
): number {
  if (completedMatches >= 40 && rating >= 4.7 && trustScore >= 850) return 4
  if (completedMatches >= 15 && rating >= 4.5 && trustScore >= 550) return 3
  if (completedMatches >= 5 && rating >= 3.8 && trustScore >= 200) return 2
  if (completedMatches >= 1) return 1
  return 0
}

// The tier a profile currently sits at (falls back to candidate when unranked).
export function currentRefereeTier(profile: RefereeSportProfile | null | undefined): RefereeTierMeta {
  if (!profile) return REFEREE_TIERS[0]
  return refereeTierByLevel(profile.level)
}

// The next tier to chase, or null when already at the top.
export function nextRefereeTier(level: number): RefereeTierMeta | null {
  return TIER_BY_LEVEL.get(level + 1) ?? null
}

export type RefereeSummary = {
  matchesRefereed: number
  rating: number | null
  cleanPct: number | null
  disputes: number
  topLevel: number
}

// Roll several per-sport trust profiles into one headline summary (rating is
// weighted by matches so a 1-match sport can't skew it).
export function summarizeRefereeSportProfiles(
  profiles: (RefereeSportProfile | null | undefined)[],
): RefereeSummary {
  const sports = profiles.filter((p): p is RefereeSportProfile => p != null)
  const matchesRefereed = sports.reduce((sum, p) => sum + p.completed_matches, 0)
  const cleanTotal = sports.reduce((sum, p) => sum + p.clean_matches, 0)
  const disputes = sports.reduce((sum, p) => sum + p.disputed_matches, 0)
  const ratingWeighted = sports.reduce((sum, p) => sum + p.rating * p.completed_matches, 0)
  const topLevel = sports.reduce((max, p) => Math.max(max, p.level), 0)

  return {
    matchesRefereed,
    rating: matchesRefereed > 0 ? ratingWeighted / matchesRefereed : null,
    cleanPct: matchesRefereed > 0 ? Math.round((cleanTotal / matchesRefereed) * 100) : null,
    disputes,
    topLevel,
  }
}

// Public profiles show earned sport levels only after real referee history
// exists. Direct appointments stay in the self-only eligibility contract.
export function refereePublicSportProfiles(
  profiles: readonly (RefereeSportProfile | null | undefined)[],
): RefereeSportProfile[] {
  const visibleByActivity = new Map(
    profiles
      .filter((profile): profile is RefereeSportProfile => (
        profile != null && profile.completed_matches > 0
      ))
      .map((profile) => [profile.activity_type, profile]),
  )

  return (['basketball', 'badminton'] as const).flatMap((activity) => {
    const profile = visibleByActivity.get(activity)
    return profile ? [profile] : []
  })
}

// Has this user actually refereed at least one match in any sport?
export function isRefereeForAnySport(
  profiles: (RefereeSportProfile | null | undefined)[],
): boolean {
  return profiles.some((p) => p != null && p.completed_matches > 0)
}
