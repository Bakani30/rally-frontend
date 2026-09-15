import { LeaderboardScreenContent } from '@/components/leaderboard/LeaderboardScreenContent'

// Stacked leaderboard route — the full board for one sport, pushed from the
// My Rank pager's LEADERBOARD button (with an `activity` param). Pops back to
// the Ranking tab. UI lives in LeaderboardScreenContent (shared, layer-clean).
export default function LeaderboardRoute() {
  return <LeaderboardScreenContent />
}
