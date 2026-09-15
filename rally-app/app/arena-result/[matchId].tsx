import { useLocalSearchParams } from 'expo-router'

import { ArenaResultPanel } from '@/components/arena-result/ArenaResultPanel'

export default function ArenaResultScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string | string[] }>()
  const resolvedMatchId = Array.isArray(matchId) ? matchId[0] : matchId

  return <ArenaResultPanel matchId={resolvedMatchId} />
}
