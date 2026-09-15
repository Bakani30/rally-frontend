// Presentational row for the unified Matches history feed (Task 3.2). Reuses the
// existing row cards — MatchListItem for settled matches, ActivityMemoryCard for
// recorded sessions — rather than rebuilding row visuals. Matches get an amber
// pin/unpin star rendered inside the card itself (MatchListItem `pin` prop), so
// the row no longer reserves a separate button column; sessions have no pin
// (only matches can be featured on a profile).
import { MatchListItem } from '@/components/match/MatchListItem'
import { ActivityMemoryCard } from '@/components/activity/ActivityMemoryCard'
import { BasketballHistoryMatchCard } from '@/components/history/BasketballHistoryMatchCard'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import type { FeedItem } from '@/lib/history/unifiedFeed'
import type { MatchHistoryImpact } from '@/lib/history/matchHistoryImpactTypes'
import type { MyMatch } from '@/types/match'

type UnifiedFeedRowProps = {
  item: FeedItem
  /** Source record looked up by `item.sourceId` — a MyMatch for kind:'match', an ActivityHistoryItem for kind:'session'. */
  record: MyMatch | ActivityHistoryItem
  currentUserId: string | undefined
  /** Whether this match is currently pinned to the profile (matches only). */
  isPinned: boolean
  /** Whether the owner is at the server's pin cap (mutes the star but keeps it tappable so the cap error surfaces). */
  atPinCap: boolean
  /** True while an add/remove pin mutation is in flight — disables the star to avoid double-taps. */
  pinMutationPending: boolean
  onTogglePin: (matchId: string) => void
  impact?: MatchHistoryImpact | null
}

export function UnifiedFeedRow({
  item,
  record,
  currentUserId,
  isPinned,
  atPinCap,
  pinMutationPending,
  onTogglePin,
  impact = null,
}: UnifiedFeedRowProps) {
  if (item.kind === 'session') {
    return <ActivityMemoryCard item={record as ActivityHistoryItem} />
  }

  const match = record as MyMatch

  if (match.activity_type === 'basketball' && match.status === 'settled' && currentUserId) {
    return (
      <BasketballHistoryMatchCard
        match={match}
        currentUserId={currentUserId}
        impact={impact}
        pin={{
          pinned: isPinned,
          atCap: atPinCap,
          pending: pinMutationPending,
          onToggle: onTogglePin,
        }}
      />
    )
  }

  return (
    <MatchListItem
      match={match}
      currentUserId={currentUserId}
      pin={{
        pinned: isPinned,
        atCap: atPinCap,
        pending: pinMutationPending,
        onToggle: onTogglePin,
      }}
    />
  )
}
