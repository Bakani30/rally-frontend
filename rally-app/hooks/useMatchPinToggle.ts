import { useCallback, useMemo } from 'react'
import { Alert } from 'react-native'
import { useAddPinnedMatch } from '@/hooks/useAddPinnedMatch'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useProfilePinnedMatches } from '@/hooks/useProfilePinnedMatches'
import { useRemovePinnedMatch } from '@/hooks/useRemovePinnedMatch'
import { friendlyFeatureMessage, PIN_CAP } from '@/lib/match/pinnedMatchConfig'

/**
 * One shared pin/unpin flow for profile pinned matches — state (pinned ids,
 * cap, in-flight), the toggle mutation with its analytics events, and the
 * error → Thai Alert surfacing. Used by both the own-history picker
 * (app/user/[id]/matches.tsx) and the unified Matches screen so the amber-star
 * behavior stays byte-identical across surfaces.
 */
export function useMatchPinToggle(ownerId: string | undefined) {
  const { data: pinnedMatches } = useProfilePinnedMatches(ownerId)
  const addPinnedMatch = useAddPinnedMatch(ownerId)
  const removePinnedMatch = useRemovePinnedMatch(ownerId)
  const { track } = useAnalytics()

  const pinnedIds = useMemo(
    () => new Set((pinnedMatches ?? []).map((p) => p.matchId)),
    [pinnedMatches],
  )
  // At-cap stars stay tappable (just muted) so the server's pinned_match_limit
  // error surfaces via the Alert instead of a dead button.
  const atPinCap = pinnedIds.size >= PIN_CAP
  const pinMutationPending = addPinnedMatch.isPending || removePinnedMatch.isPending

  const onTogglePin = useCallback(
    (matchId: string) => {
      const isPinned = pinnedIds.has(matchId)
      const mutation = isPinned ? removePinnedMatch : addPinnedMatch
      mutation.mutate(matchId, {
        onSuccess: () =>
          track({ name: 'set_featured_match', properties: { match_id: matchId, action: isPinned ? 'clear' : 'set' } }),
        onError: (e) => {
          track({ name: 'set_featured_match', properties: { match_id: matchId, action: 'error' } })
          // Supabase RPC errors are not always Error instances — read .message
          // off any object so 'pinned_match_limit' still maps to its copy.
          const raw =
            e instanceof Error
              ? e.message
              : typeof e === 'object' && e !== null && 'message' in e
                ? String((e as { message: unknown }).message)
                : ''
          // atPinCap fallback: some transports drop the message body, but a
          // failed add while already holding PIN_CAP pins can only be the cap.
          if (!isPinned && (raw.includes('pinned_match_limit') || atPinCap)) {
            Alert.alert(`ปักหมุดครบลิมิต ${PIN_CAP} แมตช์`, 'ยกเลิกหมุดเดิมก่อน แล้วค่อยปักแมตช์ใหม่')
            return
          }
          Alert.alert(
            isPinned ? 'ยกเลิกปักหมุดไม่สำเร็จ' : 'ปักหมุดแมตช์ไม่สำเร็จ',
            friendlyFeatureMessage(raw),
          )
        },
      })
    },
    [pinnedIds, atPinCap, removePinnedMatch, addPinnedMatch, track],
  )

  return { pinnedIds, atPinCap, pinMutationPending, onTogglePin }
}
