import { describe, expect, it } from 'vitest'
import {
  REFEREE_TIERS,
  currentRefereeTier,
  isRefereeForAnySport,
  nextRefereeTier,
  refereePublicSportProfiles,
  refereeLevelForStats,
  resolveRefereeDisplayLevel,
  refereeTierByLevel,
  refereeTierMeta,
  summarizeRefereeSportProfiles,
} from './refereeLevels'
import type { RefereeSportProfile } from '@/types/match'

function profile(partial: Partial<RefereeSportProfile>): RefereeSportProfile {
  return {
    user_id: 'u',
    activity_type: 'basketball',
    level: 0,
    trust_tier: 'candidate',
    rating: 0,
    trust_score: 0,
    completed_matches: 0,
    referee_verified_matches: 0,
    clean_matches: 0,
    corrected_matches: 0,
    disputed_matches: 0,
    latest_match_id: null,
    latest_settled_at: null,
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('REFEREE_TIERS', () => {
  it('is ordered low → high with contiguous levels 0..4', () => {
    expect(REFEREE_TIERS.map((tier) => tier.level)).toEqual([0, 1, 2, 3, 4])
  })

  it('names the five canonical tier keys', () => {
    expect(REFEREE_TIERS.map((tier) => tier.key)).toEqual([
      'candidate',
      'court_side',
      'community',
      'official_ready',
      'event_lead',
    ])
  })

  it('uses the Thai-first visible tier labels', () => {
    expect(REFEREE_TIERS.map((tier) => tier.label)).toEqual([
      'ผู้สมัคร',
      'หน้าใหม่',
      'มีประสบการณ์',
      'น่าเชื่อถือสูง',
      'หัวหน้ากรรมการ',
    ])
  })
})

describe('refereeLevelForStats (mirrors SQL referee_level_for)', () => {
  it('starts at candidate (0) with no completed matches', () => {
    expect(refereeLevelForStats(0, 0, 0)).toBe(0)
  })

  it('reaches court_side (1) on the first completed match', () => {
    expect(refereeLevelForStats(1, 0, 0)).toBe(1)
  })

  it('reaches community (2) only when matches + rating + trust all clear', () => {
    expect(refereeLevelForStats(5, 3.8, 200)).toBe(2)
    // rating just short -> stays court_side
    expect(refereeLevelForStats(5, 3.7, 200)).toBe(1)
    // trust just short -> stays court_side
    expect(refereeLevelForStats(5, 3.8, 199)).toBe(1)
  })

  it('reaches official_ready (3) at the documented thresholds', () => {
    expect(refereeLevelForStats(15, 4.5, 550)).toBe(3)
    expect(refereeLevelForStats(14, 4.5, 550)).toBe(2)
  })

  it('reaches event_lead (4) at the top thresholds', () => {
    expect(refereeLevelForStats(40, 4.7, 850)).toBe(4)
    expect(refereeLevelForStats(40, 4.69, 850)).toBe(3)
  })
})

describe('tier lookups', () => {
  it('maps level → tier and key → tier', () => {
    expect(refereeTierByLevel(2).key).toBe('community')
    expect(refereeTierMeta('event_lead').level).toBe(4)
  })

  it('falls back to candidate for unknown input', () => {
    expect(refereeTierByLevel(99).key).toBe('candidate')
  })

  it('returns the next tier, or null at the top', () => {
    expect(nextRefereeTier(2)?.key).toBe('official_ready')
    expect(nextRefereeTier(4)).toBeNull()
  })
})

describe('resolveRefereeDisplayLevel', () => {
  it('unlocks an appointed level immediately', () => {
    expect(resolveRefereeDisplayLevel(0, [3])).toBe(3)
  })

  it('keeps the higher earned level and clamps malformed appointments', () => {
    expect(resolveRefereeDisplayLevel(4, [2])).toBe(4)
    expect(resolveRefereeDisplayLevel(0, [99, null])).toBe(4)
    expect(resolveRefereeDisplayLevel(0, [-2, undefined])).toBe(0)
  })
})

describe('currentRefereeTier', () => {
  it('is candidate when there is no profile yet', () => {
    expect(currentRefereeTier(null).key).toBe('candidate')
  })

  it('reflects the profile level', () => {
    const p = profile({ level: 3, trust_tier: 'official_ready' })
    expect(currentRefereeTier(p).key).toBe('official_ready')
  })
})

describe('summarizeRefereeSportProfiles', () => {
  it('returns an empty summary when there are no profiles', () => {
    expect(summarizeRefereeSportProfiles([null, undefined])).toEqual({
      matchesRefereed: 0,
      rating: null,
      cleanPct: null,
      disputes: 0,
      topLevel: 0,
    })
  })

  it('weights rating by matches and rolls up counts + top level', () => {
    const bb = profile({ level: 2, rating: 4.0, completed_matches: 10, clean_matches: 9, disputed_matches: 1 })
    const bd = profile({ level: 1, rating: 5.0, completed_matches: 10, clean_matches: 10, disputed_matches: 0 })
    const summary = summarizeRefereeSportProfiles([bb, bd])
    expect(summary.matchesRefereed).toBe(20)
    expect(summary.rating).toBeCloseTo(4.5)
    expect(summary.cleanPct).toBe(95)
    expect(summary.disputes).toBe(1)
    expect(summary.topLevel).toBe(2)
  })
})

describe('refereePublicSportProfiles', () => {
  it('shows earned levels only for sports with completed referee history', () => {
    const basketball = profile({
      activity_type: 'basketball',
      completed_matches: 3,
      level: 2,
    })
    const badminton = profile({
      activity_type: 'badminton',
      completed_matches: 0,
      level: 3,
    })

    expect(refereePublicSportProfiles([badminton, null, basketball])).toEqual([basketball])
  })

  it('keeps a stable basketball then badminton order', () => {
    const badminton = profile({ activity_type: 'badminton', completed_matches: 2 })
    const basketball = profile({ activity_type: 'basketball', completed_matches: 1 })

    expect(refereePublicSportProfiles([badminton, basketball]).map((item) => item.activity_type))
      .toEqual(['basketball', 'badminton'])
  })
})

describe('isRefereeForAnySport', () => {
  it('is false without any refereed match', () => {
    expect(isRefereeForAnySport([null, profile({ completed_matches: 0 })])).toBe(false)
  })

  it('is true once a sport has a refereed match', () => {
    expect(isRefereeForAnySport([profile({ completed_matches: 3 })])).toBe(true)
  })
})
