export const arenaSessionSnapshotQueryPrefix = ['arena-session', 'snapshot'] as const

export function arenaSessionSnapshotQueryKey(
  userId: string | undefined,
  arenaId: string | undefined,
) {
  return [...arenaSessionSnapshotQueryPrefix, userId, arenaId] as const
}

export function isArenaSessionSnapshotQueryForArena(
  queryKey: readonly unknown[],
  arenaId: string,
): boolean {
  return queryKey.length === 4
    && queryKey[0] === arenaSessionSnapshotQueryPrefix[0]
    && queryKey[1] === arenaSessionSnapshotQueryPrefix[1]
    && queryKey[3] === arenaId
}
