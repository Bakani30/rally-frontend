import { memo } from 'react'
import { router } from 'expo-router'

import {
  BasketballHistoryMatchCardView,
  type BasketballHistoryPin,
} from '@/components/history/BasketballHistoryMatchCardView'
import { presentBasketballHistoryMatch } from '@/lib/history/basketballHistoryPresenter'
import type { MatchHistoryImpact } from '@/lib/history/matchHistoryImpactTypes'
import type { MyMatch } from '@/types/match'

export type BasketballHistoryMatchCardProps = {
  match: MyMatch
  currentUserId: string
  impact: MatchHistoryImpact | null
  pin: BasketballHistoryPin
}

export const BasketballHistoryMatchCard = memo(function BasketballHistoryMatchCard({
  match,
  currentUserId,
  impact,
  pin,
}: BasketballHistoryMatchCardProps) {
  const presentation = presentBasketballHistoryMatch({ match, currentUserId, impact })
  if (!presentation) return null

  return (
    <BasketballHistoryMatchCardView
      match={match}
      presentation={presentation}
      pin={pin}
      onOpen={() => router.push(`/match/${match.id}`)}
    />
  )
})
