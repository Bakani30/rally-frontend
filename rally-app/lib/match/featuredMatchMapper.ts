import type {
  MatchResult,
  ProfileFeaturedMatch,
  ProfilePinnedMatch,
  ProfilePinnedMatchMedia,
} from '@/lib/match/featuredMatchTypes'

const RESULTS: MatchResult[] = ['win', 'loss', 'tie']
const MEDIA_TYPES: ProfilePinnedMatchMedia['mediaType'][] = ['photo', 'video']
const MIN_VIDEO_DURATION_SECONDS = 1
const MAX_VIDEO_DURATION_SECONDS = 45

function normalizeSideName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function mapMedia(raw: unknown): ProfilePinnedMatchMedia | null {
  if (!raw || typeof raw !== 'object') return null

  const media = raw as Record<string, unknown>
  if (!MEDIA_TYPES.includes(media.mediaType as ProfilePinnedMatchMedia['mediaType'])) return null
  if (typeof media.mimeType !== 'string' || media.mimeType.length === 0) return null
  if (typeof media.storagePath !== 'string' || media.storagePath.length === 0) return null

  const durationSeconds = media.durationSeconds === null
    ? null
    : typeof media.durationSeconds === 'number' && Number.isFinite(media.durationSeconds)
      ? media.durationSeconds
      : null
  if (
    media.mediaType === 'video' &&
    (durationSeconds === null ||
      durationSeconds < MIN_VIDEO_DURATION_SECONDS ||
      durationSeconds > MAX_VIDEO_DURATION_SECONDS)
  ) return null

  return {
    mediaType: media.mediaType as ProfilePinnedMatchMedia['mediaType'],
    mimeType: media.mimeType,
    durationSeconds,
    storagePath: media.storagePath,
    mediaUrl: typeof media.mediaUrl === 'string' ? media.mediaUrl : null,
  }
}

// Pure: validate + normalize the jsonb returned by get_profile_featured_match.
// Returns null for missing/garbage payloads so the UI can render an empty state.
// Kept import-free of the repository/supabase client so it stays unit-testable.
export function mapFeaturedMatch(raw: unknown): ProfileFeaturedMatch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.matchId !== 'string' || typeof r.activityType !== 'string') return null
  const result = typeof r.result === 'string' && RESULTS.includes(r.result as MatchResult)
    ? (r.result as MatchResult)
    : null
  return {
    matchId: r.matchId,
    activityType: r.activityType,
    settledAt: typeof r.settledAt === 'string' ? r.settledAt : null,
    result,
    opponentName: typeof r.opponentName === 'string' ? r.opponentName : null,
    sideAName: normalizeSideName(r.sideAName, 'ทีม A'),
    sideBName: normalizeSideName(r.sideBName, 'ทีม B'),
    sideAScore: typeof r.sideAScore === 'number' && Number.isFinite(r.sideAScore) ? r.sideAScore : null,
    sideBScore: typeof r.sideBScore === 'number' && Number.isFinite(r.sideBScore) ? r.sideBScore : null,
    mySide: r.mySide === 0 || r.mySide === 1 ? r.mySide : null,
    media: mapMedia(r.media),
  }
}

// Pure: validate + normalize the jsonb array returned by
// get_profile_pinned_matches. Reuses mapFeaturedMatch's single-object
// validation per element; malformed elements are dropped and order is
// preserved (the RPC already orders by pin position).
export function mapPinnedMatches(raw: unknown): ProfilePinnedMatch[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((elem) => mapFeaturedMatch(elem))
    .filter((m): m is ProfilePinnedMatch => m !== null)
}
