import { useMemo } from 'react'

import { buildMatchDetailPolicy } from '@/lib/match/matchPagePolicy'
import type { UserWallet } from '@/lib/wallet/walletTypes'
import type { MatchWithRelations } from '@/types/match'

export function useMatchDetailPolicy(
  match: MatchWithRelations | null | undefined,
  userId: string | null | undefined,
  currentWallet?: UserWallet | null,
) {
  return useMemo(() => {
    if (!match || !userId) return null
    return buildMatchDetailPolicy(match, userId, currentWallet)
  }, [currentWallet, match, userId])
}
