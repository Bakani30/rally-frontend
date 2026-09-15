import { useCallback, useEffect, useMemo, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'

import { LeaderboardView } from '@/components/leaderboard/LeaderboardView'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import {
  LEADERBOARD_ACTIVITIES,
  type LeaderboardActivity,
  type LeaderboardScope,
} from '@/lib/leaderboard/leaderboardConfig'

function isLeaderboardActivity(value: string | undefined): value is LeaderboardActivity {
  return LEADERBOARD_ACTIVITIES.some((activity) => activity.key === value)
}

// Full leaderboard data container for one sport. Route parsing, query authority,
// analytics, scope, and current-user derivation remain here; LeaderboardView owns
// only presentation and local entrance timing.
export function LeaderboardScreenContent() {
  const { activity: activityParam } = useLocalSearchParams<{ activity?: string }>()
  const activity: LeaderboardActivity = isLeaderboardActivity(activityParam)
    ? activityParam
    : LEADERBOARD_ACTIVITIES[0].key
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const { user } = useAuth()
  const currentUserId = user?.id ?? null
  const { track } = useAnalytics()
  const { data: entries, isError, isPending, isStale, refetch } = useLeaderboard(activity, currentUserId, scope)

  useFocusEffect(
    useCallback(() => {
      if (isStale) void refetch()
    }, [isStale, refetch]),
  )

  useEffect(() => {
    track({ name: 'view_leaderboard', properties: { scope, activity } })
  }, [track, activity, scope])

  const podium = useMemo(() => (entries ?? []).filter((entry) => entry.rank <= 3).slice(0, 3), [entries])
  const list = useMemo(() => (entries ?? []).slice(0, 10), [entries])
  const ownEntry = useMemo(
    () => (currentUserId ? entries?.find((entry) => entry.userId === currentUserId) : undefined),
    [entries, currentUserId],
  )
  const showOwnEntry = !!ownEntry && !podium.some((entry) => entry.userId === ownEntry.userId) && !list.some((entry) => entry.userId === ownEntry.userId)
  const showEmpty = !isPending && !isError && (!entries || entries.length === 0)

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }, [])

  const handleOpenUser = useCallback((userId: string) => {
    guardedRouter.push(`/user/${userId}`, { actionKey: `ranking:user:${userId}` })
  }, [])

  return (
    <LeaderboardView
      activity={activity}
      scope={scope}
      podium={podium}
      list={list}
      ownEntry={ownEntry}
      showOwnEntry={showOwnEntry}
      queryState={{ isPending, isError, isEmpty: showEmpty }}
      entryCount={entries?.length ?? 0}
      currentUserId={currentUserId}
      onScopeChange={setScope}
      onRetry={() => void refetch()}
      onBack={handleBack}
      onOpenUser={handleOpenUser}
    />
  )
}
