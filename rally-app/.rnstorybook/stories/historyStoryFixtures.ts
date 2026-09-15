import type { MatchesViewProps, MatchesViewSection } from '@/components/history/MatchesView'
import { presentBasketballHistoryMatch } from '@/lib/history/basketballHistoryPresenter'
import type { MatchHistoryImpact } from '@/lib/history/matchHistoryImpactTypes'
import type { MyMatch } from '@/types/match'

export const HISTORY_STORY_STATES = [
  'loading',
  'match_load_error',
  'empty',
  'basketball_ready',
  'activity_history_error',
  'impact_error',
] as const

export type HistoryStoryState = (typeof HISTORY_STORY_STATES)[number]

const basketballMatch = {
  id: 'storybook-basketball-settled',
  created_by: 'storybook-player',
  activity_type: 'basketball',
  stake: 25,
  stake_currency: 'leaderboard_point',
  status: 'settled',
  deadline: '2026-09-01T12:00:00.000Z',
  winner_user_id: 'storybook-player',
  is_tie: false,
  is_coop: false,
  updated_at: '2026-09-01T12:00:00.000Z',
  settled_at: '2026-09-01T11:00:00.000Z',
  match_participants: [{ user_id: 'storybook-player', side: 0 }, { user_id: 'storybook-opponent', side: 1 }],
  match_team_result_submissions: [
    { id: 'story-score-0', side_index: 0, submitted_by: 'storybook-player', team_score: 71, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-09-01T11:00:00.000Z', updated_at: '2026-09-01T11:00:00.000Z' },
    { id: 'story-score-1', side_index: 1, submitted_by: 'storybook-opponent', team_score: 64, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-09-01T11:00:00.000Z', updated_at: '2026-09-01T11:00:00.000Z' },
  ],
} as MyMatch

const basketballImpact: MatchHistoryImpact = {
  matchId: 'storybook-basketball-settled', activityType: 'basketball', settledAt: '2026-09-01T11:00:00.000Z', mySide: 0,
  myStakeAmount: 25, myStakeCurrency: 'leaderboard_point', scoreDelta: 8, ratingBefore: 800, ratingAfter: 808, ratingDelta: 8,
}

const sections: MatchesViewSection[] = [
  { key: 'pending', title: 'ล็อบบี้', emptyIcon: 'bullhorn-outline', emptyText: 'ยังไม่มีแมตช์ในล็อบบี้', data: [] },
  { key: 'live', title: 'กำลังแข่ง', emptyIcon: 'timer-sand', emptyText: 'ยังไม่มีแมตช์ที่กำลังแข่ง', data: [] },
  { key: 'history', title: 'ประวัติ', emptyIcon: 'history', emptyText: 'ยังไม่มีประวัติ', data: [{ rowKind: 'feed', feedItem: { key: 'match:storybook-basketball-settled' } }] },
]

const base = {
  category: 'all' as const,
  pendingCount: 0,
  liveCount: 0,
  historyCount: 1,
  labels: {
    title: 'แมตช์',
    subtitle: 'ล็อบบี้ 0 · กำลังแข่ง 0 · ประวัติ 1',
    loadMatchesFailed: 'โหลดแมตช์ไม่สำเร็จ',
    genericError: 'เกิดข้อผิดพลาด',
    historyLoadFailed: 'โหลดประวัติกิจกรรมไม่สำเร็จ',
    findFriends: 'ค้นหาเพื่อน',
    friendsDashboard: 'แดชบอร์ดเพื่อน',
    friendsDashboardPending: 'แดชบอร์ดเพื่อน · มีคำขอใหม่',
  },
  matchesError: null,
  historyError: null,
  historyPending: false,
  impactsError: false,
  impactsFetching: false,
  hasIncomingFriendRequests: false,
  sections,
} satisfies Pick<MatchesViewProps, 'category' | 'pendingCount' | 'liveCount' | 'historyCount' | 'labels' | 'matchesError' | 'historyError' | 'historyPending' | 'impactsError' | 'impactsFetching' | 'hasIncomingFriendRequests' | 'sections'>

export const HISTORY_STORY_FIXTURES = Object.freeze({
  loading: { ...base, screenState: 'loading' as const },
  match_load_error: { ...base, screenState: 'content' as const, matchesError: new Error('Storybook match history unavailable') },
  empty: {
    ...base,
    screenState: 'content' as const,
    historyCount: 0,
    labels: { ...base.labels, subtitle: 'ล็อบบี้ 0 · กำลังแข่ง 0 · ประวัติ 0' },
    sections: sections.map((section) => ({ ...section, data: [] })),
  },
  basketball_ready: { ...base, screenState: 'content' as const },
  activity_history_error: { ...base, screenState: 'content' as const, historyError: new Error('Storybook activity history unavailable') },
  impact_error: { ...base, screenState: 'content' as const, impactsError: true },
})

export const BASKETBALL_HISTORY_STORY_RECORD = Object.freeze({
  match: basketballMatch,
  presentation: presentBasketballHistoryMatch({ match: basketballMatch, currentUserId: 'storybook-player', impact: basketballImpact })!,
  impact: basketballImpact,
})
