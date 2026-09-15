import { MyRankPager } from '@/components/rank/MyRankPager'

// Ranking tab — opens the user's own My Rank pager first (per-sport rank
// identity). The full leaderboard board is a pushed screen reached via each
// sport's LEADERBOARD button (app/leaderboard/index.tsx).
export default function RankingTab() {
  return <MyRankPager />
}
