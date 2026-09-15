import { useEffect, useRef } from 'react'
import { useSegments } from 'expo-router'
import { PromotionMoment } from '@/components/ranks/PromotionMoment'
import { useUnseenTierEvents } from '@/hooks/useTierEvents'
import { useAnalytics } from '@/hooks/useAnalytics'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { RankFrameTab } from '@/lib/cosmetics/rankFrameGating'

// Routes that already show their own full-screen recap Modal (basketball
// MatchRecapMoment in app/match/[id].tsx, solo RunRecapMoment in
// app/run/summary/[sessionId].tsx). iOS cannot stack a second RN Modal over
// a visible one (repo rule), so PromotionMoment must wait until the user has
// navigated off those screens — sequence, not stack.
//
// NOTE for future implementers: any new full-screen recap Modal route added
// to the app MUST be added here too, or PromotionMoment will attempt to
// stack over it and iOS will silently fail to present the second Modal.
function blocksPromotionMoment(segments: readonly string[]): boolean {
  const [first, second] = segments
  if (first === 'match') return true
  if (first === 'run' && second === 'summary') return true
  return false
}

/**
 * App-wide mount point for the rank-promotion celebration (Rank Identity v1).
 * Reads unseen tier_events, shows the latest promotion PER ACTIVITY in
 * sequence (momentQueue[0], then the next on dismiss) once the user is on a
 * screen that can safely present a full-screen Modal. Demotions are never
 * surfaced here — see tierEventTriage.ts / the notifications screen's quiet
 * demotion rows.
 */
export function PromotionMomentGate() {
  const segments = useSegments() as string[]
  const { momentEvent, markSeen } = useUnseenTierEvents()
  const { track } = useAnalytics()
  const shownForRef = useRef<string | null>(null)

  const blocked = blocksPromotionMoment(segments)
  const visible = !!momentEvent && !blocked

  useEffect(() => {
    if (!visible || !momentEvent) return
    if (shownForRef.current === momentEvent.id) return
    shownForRef.current = momentEvent.id
    track({
      name: 'rank_promotion_moment_shown',
      properties: {
        activity: momentEvent.activityType,
        from_tier: momentEvent.fromTier,
        to_tier: momentEvent.toTier,
      },
    })
  }, [visible, momentEvent, track])

  if (!momentEvent) return null

  function dismiss() {
    if (momentEvent) markSeen([momentEvent.id])
  }

  function equipFrame() {
    if (!momentEvent) return
    dismiss()
    track({ name: 'rank_frame_locker_viewed', properties: { source: 'promotion_moment' } })
    guardedRouter.push(
      { pathname: '/cosmetics', params: { tab: 'frame', category: momentEvent.activityType as RankFrameTab } },
      { actionKey: `rank-promotion:${momentEvent.id}:equip` },
    )
  }

  return (
    <PromotionMoment
      visible={visible}
      event={momentEvent}
      onEquipFrame={equipFrame}
      onDismiss={dismiss}
    />
  )
}
