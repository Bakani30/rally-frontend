import { useQuery } from '@tanstack/react-query'

import { useAccountRealtime } from '@/hooks/useAccountRealtime'
import {
  getHomeWalletSnapshot,
  homeWalletSnapshotQueryKey,
} from '@/lib/wallet/homeWalletSnapshot'

export function useHomeWalletSnapshot(userId: string | undefined) {
  useAccountRealtime(userId)

  return useQuery({
    queryKey: homeWalletSnapshotQueryKey(userId),
    queryFn: () => getHomeWalletSnapshot(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
