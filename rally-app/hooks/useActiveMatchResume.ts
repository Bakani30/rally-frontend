import { useCallback, useEffect } from 'react'
import { AppState } from 'react-native'
import { useGlobalSearchParams, useSegments } from 'expo-router'
import {
  clearActiveMatchLock,
  getActiveMatchLock,
  isMatchLockNavigationSurface,
  shouldLockMatchForUser,
} from '@/lib/match/activeMatchLock'
import { getMatch } from '@/lib/match/matchService'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export function useActiveMatchResume(input: {
  userId: string | undefined
  enabled: boolean
}) {
  const { enabled, userId } = input
  const segments = useSegments()
  const params = useGlobalSearchParams()

  const resume = useCallback(async (isCancelled: () => boolean = () => false) => {
    if (!enabled || !userId) return

    const currentUserId = userId
    const segmentList = segments as string[]

    const matchId = await getActiveMatchLock(currentUserId)
    if (!matchId || isCancelled()) return

    const match = await getMatch(matchId)
    if (isCancelled()) return

    if (!shouldLockMatchForUser(match, currentUserId)) {
      await clearActiveMatchLock(currentUserId, matchId)
      return
    }

    const alreadyInLockedSurface = isMatchLockNavigationSurface(segmentList, params, matchId)
    if (!alreadyInLockedSurface) {
      guardedRouter.replace(`/match/${matchId}`, { actionKey: `active-match-resume:${matchId}` })
    }
  }, [enabled, params, segments, userId])

  useEffect(() => {
    let cancelled = false
    void resume(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [resume])

  useEffect(() => {
    if (!enabled || !userId) return undefined

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void resume()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [enabled, resume, userId])
}
