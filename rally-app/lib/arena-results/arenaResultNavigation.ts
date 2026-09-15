import type { QueryClient } from '@tanstack/react-query'

import { isArenaSessionSnapshotQueryForArena } from '@/lib/arena-sessions/arenaSessionSnapshotQuery'

type ArenaResultNavigation = {
  canGoBack: () => boolean
  back: () => void
  replace: (href: string) => void
}

/** Refresh only this Arena's actor-scoped Session snapshots before leaving a result. */
export async function returnToArenaSession({
  queryClient,
  arenaEventId,
  navigation,
}: {
  queryClient: QueryClient
  arenaEventId: string
  navigation: ArenaResultNavigation
}) {
  const predicate = (query: { queryKey: readonly unknown[] }) => (
    isArenaSessionSnapshotQueryForArena(query.queryKey, arenaEventId)
  )

  try {
    await queryClient.invalidateQueries({ predicate, refetchType: 'none' })
    await queryClient.refetchQueries({ predicate, type: 'active' })
  } catch {
    // Navigation remains available when a transient reconnect fails. The
    // invalidated Session query will retry through its normal lifecycle.
  }

  if (navigation.canGoBack()) {
    navigation.back()
    return
  }
  navigation.replace(`/arena-session/${arenaEventId}`)
}
