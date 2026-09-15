import { useCallback } from 'react'

import { guardedRouter } from '@/lib/navigation/guardedRouter'

import { RankingRowView, type RankingRowViewProps } from './RankingRowView'

export type RankingRowProps = Omit<RankingRowViewProps, 'onPress'>

/** Navigation wrapper for the pure RankingRowView presentation. */
export function RankingRow({ entry, ...props }: RankingRowProps) {
  const handlePress = useCallback(
    () => guardedRouter.push(`/user/${entry.userId}`, { actionKey: `ranking:user:${entry.userId}` }),
    [entry.userId],
  )

  return <RankingRowView entry={entry} onPress={handlePress} {...props} />
}
