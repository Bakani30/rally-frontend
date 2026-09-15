/**
 * Pure screen-state decision for the unified Matches screen.
 *
 * Regression pin for the session-only-user bug: the screen used to gate its
 * full-screen "ยังไม่มี match" empty state on `matches` alone, so a user with
 * only recorded runs (no competitive matches — a very plausible running-first
 * user) never saw their history. The Matches screen now always keeps its
 * content shell and renders an icon/text empty state inside each section.
 */
export type MatchesScreenState = 'loading' | 'content'

export type MatchesScreenStateInput = {
  /** Matches in the pending or live buckets (everything not settled). */
  pendingLiveCount: number
  /** Length of the merged unified feed (settled matches + sessions). */
  feedCount: number
  matchesPending: boolean
  historyPending: boolean
}

export function deriveMatchesScreenState(input: MatchesScreenStateInput): MatchesScreenState {
  // Pending/live sections cannot render without the matches source.
  if (input.matchesPending) return 'loading'
  if (input.pendingLiveCount > 0 || input.feedCount > 0) return 'content'
  // Everything empty so far, but sessions are still loading — keep the loader
  // until the merged feed is known, then render section-level empty states.
  if (input.historyPending) return 'loading'
  return 'content'
}
