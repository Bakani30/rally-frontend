import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getFirstRouteParam,
  nativeUrlToRoute,
  normalizeOverlayAction,
  type OverlayActionRouteParams,
} from '@/lib/overlay/rallyIslandSurface'
import { useAcceptFriendRequest } from '@/hooks/useFriends'
import { useRespondInvite } from '@/hooks/useRespondInvite'
import { cancelAndroidSystemSurface } from '@/lib/overlay/androidOverlayBridge'
import { useNotificationBannerStore } from '@/stores/notificationBannerStore'
import { resolveAttentionDecision } from '@/lib/notifications/attentionPolicy'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type OverlayActionStatus = 'pending' | 'done' | 'error'

export function useAndroidOverlayAction(params: OverlayActionRouteParams) {
  const acceptFriendRequest = useAcceptFriendRequest()
  const respondInvite = useRespondInvite()
  const [status, setStatus] = useState<OverlayActionStatus>('pending')
  const [message, setMessage] = useState('กำลังอัปเดตคำเชิญ…')

  const actionInput = getFirstRouteParam(params.action)
  const routeInput = getFirstRouteParam(params.route)
  const surfaceKey = getFirstRouteParam(params.surfaceKey)
  const surfaceType = getFirstRouteParam(params.surfaceType)
  const title = getFirstRouteParam(params.title)
  const body = getFirstRouteParam(params.body)
  const headline = getFirstRouteParam(params.headline)
  const actorName = getFirstRouteParam(params.actorName)
  const subtitle = getFirstRouteParam(params.subtitle)
  const activityType = getFirstRouteParam(params.activityType)
  const avatarUrl = getFirstRouteParam(params.avatarUrl)
  const matchId = getFirstRouteParam(params.matchId)
  const inviteId = getFirstRouteParam(params.inviteId)
  const requesterId = getFirstRouteParam(params.requesterId)
  const showBanner = useNotificationBannerStore((state) => state.showBanner)
  const stake = useMemo(() => parseStake(getFirstRouteParam(params.stake)), [params.stake])
  const handledKey = [
    actionInput,
    routeInput,
    surfaceKey,
    surfaceType,
    title,
    body,
    headline,
    actorName,
    subtitle,
    activityType,
    avatarUrl,
    matchId,
    inviteId,
    requesterId,
    stake ?? '',
  ].join(':')
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (handledRef.current === handledKey) return undefined
    handledRef.current = handledKey

    const action = normalizeOverlayAction(actionInput)
    let cancelled = false

    async function run() {
      const fallbackRoute = routeInput ? toRouterPath(routeInput) : '/notifications'
      const matchRoute = matchId ? `/match/${matchId}` : null
      let targetRoute = fallbackRoute

      try {
        if (action === 'expand_in_app') {
          setMessage('กำลังเปิด Rally Island…')
          const decision = resolveAttentionDecision({
            type: surfaceType === 'friend_request' ? 'friend_request' : 'match_invited',
            route: fallbackRoute,
            matchId,
            inviteId,
            requesterId,
          }, {
            appState: 'active',
            currentRoute: '/',
          })
          showBanner({
            id: surfaceKey ?? undefined,
            kind: surfaceType === 'friend_request' ? 'friend_request' : 'match_invited',
            title: title ?? (surfaceType === 'friend_request' ? 'คำขอเป็นเพื่อน' : 'คำเชิญเข้า match'),
            body: actorName ?? body ?? (surfaceType === 'friend_request' ? 'เพื่อนใหม่' : 'คำเชิญใหม่'),
            headline: headline ?? actorName ?? body ?? title,
            actorName: actorName ?? body,
            subtitle: subtitle ?? body ?? title,
            route: fallbackRoute,
            matchId,
            inviteId,
            requesterId,
            avatarUrl,
            activityType,
          }, {
            expanded: true,
            expandedMode: 'pinned',
            priority: decision.priority,
            dedupeKey: decision.dedupeKey,
            ttlMs: decision.ttlMs,
            targetRoute: decision.targetRoute,
          })
          if (surfaceKey) {
            await cancelAndroidSystemSurface(surfaceKey).catch(() => undefined)
          }
          setStatus('done')
          setMessage('เปิดแล้ว')
          guardedRouter.dismissTo('/', { actionKey: 'overlay:expand-home' })
          return
        }

        if (action === 'accept_invite') {
          setMessage('กำลังรับคำเชิญ…')
          if (inviteId) {
            await respondInvite.mutateAsync({
              inviteId,
              action: 'accept',
              stake: stake ?? undefined,
            })
          }
          targetRoute = inviteId && matchRoute ? matchRoute : '/notifications'
        } else if (action === 'decline_invite') {
          setMessage('กำลังปฏิเสธคำเชิญ…')
          if (inviteId) {
            await respondInvite.mutateAsync({ inviteId, action: 'decline' })
          }
          if (surfaceKey) {
            await cancelAndroidSystemSurface(surfaceKey).catch(() => undefined)
          }
          setStatus('done')
          setMessage('ปิดแล้ว')
          guardedRouter.dismissTo('/', { actionKey: 'overlay:decline-home' })
          return
        } else if (action === 'accept_friend_request') {
          setMessage('กำลังรับเพื่อน…')
          targetRoute = '/friends'
          if (requesterId) {
            await acceptFriendRequest.mutateAsync(requesterId)
          }
        } else if (action === 'pause_run' || action === 'resume_run' || action === 'end_run') {
          // Lock-screen run controls (Live Activity / notification buttons).
          // Returns before the cancelAndroidSystemSurface teardown below —
          // the ongoing run surface must survive; the island component
          // updates/ends it from run-session state.
          const { getRunSessionService } = await import(
            '@/lib/run-tracking/session/runSessionServiceFactory'
          )
          const service = getRunSessionService()
          if (action === 'pause_run') {
            setMessage('พักการวิ่งแล้ว')
            service.pause()
          } else if (action === 'resume_run') {
            setMessage('วิ่งต่อแล้ว')
            service.resume()
          } else {
            setMessage('กำลังจบการวิ่ง…')
            await service.stop()
          }
          if (cancelled) return
          setStatus('done')
          guardedRouter.replace('/run/active', { actionKey: `overlay:${action}` })
          return
        } else if (action === 'dismiss_friend_request' || action === 'dismiss') {
          setMessage('ปิดแจ้งเตือนแล้ว')
          targetRoute = fallbackRoute
        } else if (action === 'open') {
          setMessage('กำลังเปิด Rally…')
          targetRoute = fallbackRoute
        } else {
          targetRoute = fallbackRoute
        }

        if (cancelled) return
        if (surfaceKey) {
          await cancelAndroidSystemSurface(surfaceKey).catch(() => undefined)
        }
        setStatus('done')
        setMessage('เรียบร้อย')
        guardedRouter.replace(targetRoute as never, { actionKey: `overlay:${action ?? 'route'}:${targetRoute}` })
      } catch (error) {
        console.warn('Failed to handle Android overlay action', error)
        if (cancelled) return
        setStatus('error')
        setMessage('เปิดหน้าที่เกี่ยวข้องให้ตรวจต่อ')
        setTimeout(() => {
          guardedRouter.replace('/notifications', { actionKey: 'overlay:error-notifications' })
        }, 650)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [
    actionInput,
    acceptFriendRequest,
    activityType,
    actorName,
    avatarUrl,
    body,
    handledKey,
    headline,
    inviteId,
    matchId,
    requesterId,
    respondInvite,
    routeInput,
    showBanner,
    surfaceKey,
    surfaceType,
    stake,
    subtitle,
    title,
  ])

  return { status, message }
}

function toRouterPath(route: string): string {
  const path = nativeUrlToRoute(route)
  return path.startsWith('/') ? path : `/${path}`
}

function parseStake(value: string | null): number | null {
  if (!value) return null
  const stake = Number(value)
  return Number.isInteger(stake) ? stake : null
}
