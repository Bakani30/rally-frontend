import { describe, expect, it } from 'vitest'
import { mapFeaturedMatch, mapPinnedMatches } from '@/lib/match/featuredMatchMapper'

describe('mapFeaturedMatch', () => {
  it('returns null for null/garbage', () => {
    expect(mapFeaturedMatch(null)).toBeNull()
    expect(mapFeaturedMatch({})).toBeNull()
    expect(mapFeaturedMatch({ matchId: 1 })).toBeNull()
  })

  it('maps a valid win row', () => {
    const out = mapFeaturedMatch({
      matchId: 'm1',
      activityType: 'basketball',
      settledAt: '2026-06-20T00:00:00Z',
      result: 'win',
      opponentName: 'Bee',
      sideAName: 'ทีม A',
      sideBName: 'ทีม B',
      sideAScore: 12,
      sideBScore: 9,
      mySide: 0,
      media: null,
    })
    expect(out).toEqual({
      matchId: 'm1',
      activityType: 'basketball',
      settledAt: '2026-06-20T00:00:00Z',
      result: 'win',
      opponentName: 'Bee',
      sideAName: 'ทีม A',
      sideBName: 'ทีม B',
      sideAScore: 12,
      sideBScore: 9,
      mySide: 0,
      media: null,
    })
  })

  it('coerces unknown result to null and missing fields to null', () => {
    const out = mapFeaturedMatch({ matchId: 'm2', activityType: 'running', result: 'bogus' })
    expect(out?.result).toBeNull()
    expect(out?.opponentName).toBeNull()
    expect(out?.sideAName).toBe('ทีม A')
    expect(out?.sideBName).toBe('ทีม B')
    expect(out?.settledAt).toBeNull()
    expect(out?.sideAScore).toBeNull()
    expect(out?.sideBScore).toBeNull()
    expect(out?.mySide).toBeNull()
    expect(out?.media).toBeNull()
  })

  it('rejects non-numeric scores and out-of-range sides', () => {
    const out = mapFeaturedMatch({
      matchId: 'm3',
      activityType: 'basketball',
      sideAScore: '12',
      sideBScore: null,
      mySide: 2,
    })
    expect(out?.sideAScore).toBeNull()
    expect(out?.sideBScore).toBeNull()
    expect(out?.mySide).toBeNull()
  })

  it('maps side names, scores, and signed media metadata', () => {
    expect(mapFeaturedMatch({
      matchId: 'm1', activityType: 'running', sideAName: 'Rally Red', sideBName: 'Rally Blue',
      sideAScore: 8, sideBScore: 6, mySide: 0,
      media: {
        mediaType: 'video', mimeType: 'video/mp4', durationSeconds: 18,
        storagePath: 'user/m1/profile-pinned/highlight.mp4', mediaUrl: 'signed://m1',
      },
    })).toMatchObject({
      sideAName: 'Rally Red',
      sideBName: 'Rally Blue',
      sideAScore: 8,
      sideBScore: 6,
      mySide: 0,
      media: {
        mediaType: 'video',
        mimeType: 'video/mp4',
        durationSeconds: 18,
        storagePath: 'user/m1/profile-pinned/highlight.mp4',
        mediaUrl: 'signed://m1',
      },
    })
  })

  it.each([0, -1, 46])('ignores video media with durationSeconds=%s', (durationSeconds) => {
    const out = mapFeaturedMatch({
      matchId: 'm-invalid-video',
      activityType: 'running',
      media: {
        mediaType: 'video',
        mimeType: 'video/mp4',
        durationSeconds,
        storagePath: 'user/m-invalid-video/profile-pinned/highlight.mp4',
      },
    })

    expect(out?.media).toBeNull()
  })

  it('preserves valid photo media and videos at the duration limits', () => {
    const base = {
      matchId: 'm-valid-media',
      activityType: 'running',
      mimeType: 'video/mp4',
      storagePath: 'user/m-valid-media/profile-pinned/highlight.mp4',
    }

    expect(mapFeaturedMatch({
      ...base,
      media: { ...base, mediaType: 'video', durationSeconds: 1 },
    })?.media?.durationSeconds).toBe(1)
    expect(mapFeaturedMatch({
      ...base,
      media: { ...base, mediaType: 'video', durationSeconds: 45 },
    })?.media?.durationSeconds).toBe(45)
    expect(mapFeaturedMatch({
      ...base,
      media: {
        ...base,
        mediaType: 'photo',
        mimeType: 'image/jpeg',
        durationSeconds: null,
        storagePath: 'user/m-valid-media/profile-pinned/highlight.jpg',
      },
    })?.media).toMatchObject({
      mediaType: 'photo',
      mimeType: 'image/jpeg',
      durationSeconds: null,
      storagePath: 'user/m-valid-media/profile-pinned/highlight.jpg',
    })
  })

  it('uses fallback side labels and ignores malformed media', () => {
    const out = mapFeaturedMatch({
      matchId: 'm4',
      activityType: 'future-settled-activity',
      sideAName: null,
      sideBName: 42,
      sideAScore: '8',
      sideBScore: undefined,
      media: { mediaType: 'gif', mimeType: 'image/gif', durationSeconds: 2 },
    })

    expect(out).toMatchObject({
      activityType: 'future-settled-activity',
      sideAName: 'ทีม A',
      sideBName: 'ทีม B',
      sideAScore: null,
      sideBScore: null,
      media: null,
    })
  })
})

describe('mapPinnedMatches', () => {
  it('maps a jsonb array to ProfilePinnedMatch[], preserving order', () => {
    const out = mapPinnedMatches([
      {
        matchId: 'm1',
        activityType: 'basketball',
        settledAt: '2026-06-20T00:00:00Z',
        result: 'win',
        opponentName: 'Bee',
        sideAName: 'ทีม A',
        sideBName: 'ทีม B',
        sideAScore: 12,
        sideBScore: 9,
        mySide: 0,
        media: null,
      },
      {
        matchId: 'm2',
        activityType: 'running',
        settledAt: '2026-06-21T00:00:00Z',
        result: 'loss',
        opponentName: 'Ann',
      },
    ])
    expect(out).toEqual([
      {
        matchId: 'm1',
        activityType: 'basketball',
        settledAt: '2026-06-20T00:00:00Z',
        result: 'win',
        opponentName: 'Bee',
        sideAName: 'ทีม A',
        sideBName: 'ทีม B',
        sideAScore: 12,
        sideBScore: 9,
        mySide: 0,
        media: null,
      },
      {
        matchId: 'm2',
        activityType: 'running',
        settledAt: '2026-06-21T00:00:00Z',
        result: 'loss',
        opponentName: 'Ann',
        sideAName: 'ทีม A',
        sideBName: 'ทีม B',
        sideAScore: null,
        sideBScore: null,
        mySide: null,
        media: null,
      },
    ])
  })

  it('drops malformed elements', () => {
    const out = mapPinnedMatches([
      { matchId: 'm1', activityType: 'basketball' },
      { matchId: 1 },
      null,
      { activityType: 'running' },
    ])
    expect(out).toEqual([
      {
        matchId: 'm1',
        activityType: 'basketball',
        settledAt: null,
        result: null,
        opponentName: null,
        sideAName: 'ทีม A',
        sideBName: 'ทีม B',
        sideAScore: null,
        sideBScore: null,
        mySide: null,
        media: null,
      },
    ])
  })

  it('returns [] for non-array/null input', () => {
    expect(mapPinnedMatches(null)).toEqual([])
    expect(mapPinnedMatches(undefined)).toEqual([])
    expect(mapPinnedMatches({})).toEqual([])
    expect(mapPinnedMatches('not-an-array')).toEqual([])
  })
})
