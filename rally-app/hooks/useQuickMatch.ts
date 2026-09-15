import { useCallback, useRef } from 'react'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'

import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useCreateMatch } from '@/hooks/useCreateMatch'
import { useSetMatchSpectators } from '@/hooks/useSpectate'
import { getDefaultUnscheduledLobbyDeadline } from '@/lib/match/matchConfig'
import { formatMatchActionError } from '@/lib/match/matchErrorPresentation'
import {
  describeQuickMatchPreset,
  getRoomFirstDraftStorageKey,
  parseQuickMatchPreset,
} from '@/lib/match/roomFirstDraft'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import type { JoinMode } from '@/types/match'

const CUSTOMIZE_ROUTE = {
  pathname: '/match/new',
  params: { activity: 'basketball', source: 'quick' },
} as const

export const QUICK_MATCH_PRESET_QUERY_KEY = ['quick-match-preset'] as const

function analyticsErrorReason(error: unknown): string {
  if (isEdgeFunctionError(error)) return error.code ?? `http_${error.status ?? 'unknown'}`
  if (error instanceof Error) return error.name || 'error'
  return 'unknown_error'
}

/**
 * One-tap basketball match create from the last-used room-first draft. The
 * draft never persists an entry code (only the `isLocked` toggle state), so a
 * "code" lobby has nothing to submit here — Quick Match always creates
 * `private` or `open`, never `code`. Users who want a code lobby use the
 * customize screen where they can enter one.
 */
export function useQuickMatch() {
  const { user } = useAuth()
  const { track } = useAnalytics()
  const createMatchMutation = useCreateMatch()
  const setSpectatorsMutation = useSetMatchSpectators()
  const busyRef = useRef(false)

  const presetQuery = useQuery({
    queryKey: QUICK_MATCH_PRESET_QUERY_KEY,
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(getRoomFirstDraftStorageKey('basketball'))
      return parseQuickMatchPreset(raw)
    },
  })

  const preset = presetQuery.data ?? null
  const presetLabel = preset ? describeQuickMatchPreset(preset) : null

  const openCustomize = useCallback(() => {
    guardedRouter.push(CUSTOMIZE_ROUTE, { actionKey: 'quick-match:customize' })
  }, [])

  const createNow = useCallback(() => {
    if (busyRef.current) return
    if (!preset) {
      openCustomize()
      return
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in again before creating a match.')
      return
    }

    // A locked public preset (isLocked) means the room-first draft would have
    // shown as joinMode 'code' on the customize screen, but Quick Match has
    // no stored entry code to submit — fall back to 'private' rather than
    // silently opening the lobby to anyone.
    const joinMode: JoinMode =
      preset.lobbyMode === 'private_code' ? 'private' : preset.isLocked ? 'private' : 'open'

    busyRef.current = true
    createMatchMutation
      .mutateAsync({
        activity: 'basketball',
        teamSize: preset.teamSize,
        minStake: preset.stake,
        creatorStake: preset.stake,
        joinMode,
        ruleParams: {},
        deadline: getDefaultUnscheduledLobbyDeadline(),
        creatorUserId: user.id,
        creatorProfile: { id: user.id, email: user.email ?? '', display_name: null },
      })
      .then(({ matchId }) => {
        if (preset.allowSpectators) {
          setSpectatorsMutation.mutate(
            { matchId, allow: true },
            {
              onError: () => {
                Alert.alert('เปิดดูสดไม่สำเร็จ', 'เปิดใหม่ได้ในห้องแข่ง')
              },
            },
          )
        }
        track({
          name: 'quick_match_create',
          properties: { match_id: matchId, stake: preset.stake, team_size: preset.teamSize },
        })
        guardedRouter.replace(`/match/${matchId}`, { actionKey: `quick-match:${matchId}` })
      })
      .catch((e) => {
        track({
          name: 'quick_match_create_failed',
          properties: { reason: analyticsErrorReason(e), stake: preset.stake, team_size: preset.teamSize },
        })
        Alert.alert('Error', formatMatchActionError(e, 'basketball'))
      })
      .finally(() => {
        busyRef.current = false
      })
  }, [createMatchMutation, openCustomize, preset, setSpectatorsMutation, track, user])

  return {
    presetLabel,
    busy: createMatchMutation.isPending,
    createNow,
    openCustomize,
  }
}
