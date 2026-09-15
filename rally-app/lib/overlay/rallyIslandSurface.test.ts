import { describe, expect, it } from 'vitest'
import {
  createOverlayActionUrl,
  nativeUrlToRoute,
  normalizeOverlayAction,
  selectRallyIslandHostDecision,
  selectRallyIslandHost,
  toAndroidOverlaySurface,
  type RallyIslandSurface,
} from './rallyIslandSurface'

const MATCH_ID = '11111111-1111-4111-8111-111111111111'
const INVITE_ID = '33333333-3333-4333-8333-333333333333'
const REQUESTER_ID = '44444444-4444-4444-8444-444444444444'

function makeSurface(): RallyIslandSurface {
  return {
    key: 'invite-1',
    surfaceType: 'match_invite',
    eyebrow: 'MATCH INVITE',
    title: 'Bam Rally',
    headline: 'Bam Rally',
    actorName: 'Bam Rally',
    subtitle: '1v1 basketball',
    body: 'คำเชิญเข้า match',
    compactBody: 'Basketball invite',
    expandedSubtitle: '1v1 basketball',
    accentColor: '#eac31a',
    iconName: 'basketball',
    activityType: 'basketball',
    route: '/notifications',
    primaryMetric: { label: 'MODE', value: '1v1' },
    primaryAction: {
      type: 'accept_invite',
      label: 'Accept',
      style: 'primary',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
    },
    secondaryAction: {
      type: 'decline_invite',
      label: 'Decline',
      style: 'destructive',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
    },
    accessibilityLabel: 'คำเชิญเข้า match จาก Bam Rally',
  }
}

describe('rally island surface', () => {
  it('serializes accept invite actions to overlay deep links', () => {
    const surface = makeSurface()
    const url = createOverlayActionUrl(surface.primaryAction!, surface)

    expect(url).toContain('rallyapp:///overlay-action?')
    expect(url).toContain('action=accept_invite')
    expect(url).toContain(`matchId=${MATCH_ID}`)
    expect(url).toContain(`inviteId=${INVITE_ID}`)
  })

  it('serializes decline invite actions to overlay deep links', () => {
    const surface = makeSurface()
    const url = createOverlayActionUrl(surface.secondaryAction!, surface)

    expect(url).toContain('rallyapp:///overlay-action?')
    expect(url).toContain('action=decline_invite')
    expect(url).toContain(`matchId=${MATCH_ID}`)
    expect(url).toContain(`inviteId=${INVITE_ID}`)
  })

  it('accepts lock-screen run control actions and rejects unknown values', () => {
    // pause_run/resume_run/end_run arrive from native deep links (Live
    // Activity buttons, notification actions) — dropping one here silently
    // turns the button into a no-op navigation.
    expect(normalizeOverlayAction('pause_run')).toBe('pause_run')
    expect(normalizeOverlayAction('resume_run')).toBe('resume_run')
    expect(normalizeOverlayAction('end_run')).toBe('end_run')
    expect(normalizeOverlayAction('delete_run')).toBeNull()
  })

  it('serializes expand-in-app actions with enough data to hydrate Home expanded state', () => {
    const surface = makeSurface()
    const url = createOverlayActionUrl({
      type: 'expand_in_app',
      label: 'Expand',
      route: surface.route,
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
    }, surface)
    const parsed = new URL(url!)

    expect(normalizeOverlayAction(parsed.searchParams.get('action'))).toBe('expand_in_app')
    expect(parsed.searchParams.get('surfaceType')).toBe('match_invite')
    expect(parsed.searchParams.get('surfaceKey')).toBe('invite-1')
    expect(parsed.searchParams.get('route')).toBe('/notifications')
    expect(parsed.searchParams.get('title')).toBe('Bam Rally')
    expect(parsed.searchParams.get('body')).toBe('1v1 basketball')
    expect(parsed.searchParams.get('headline')).toBe('Bam Rally')
    expect(parsed.searchParams.get('actorName')).toBe('Bam Rally')
    expect(parsed.searchParams.get('subtitle')).toBe('1v1 basketball')
    expect(parsed.searchParams.get('activityType')).toBe('basketball')
    expect(parsed.searchParams.get('matchId')).toBe(MATCH_ID)
    expect(parsed.searchParams.get('inviteId')).toBe(INVITE_ID)
  })

  it('projects shared surface data to the Android overlay payload', () => {
    const payload = toAndroidOverlaySurface(makeSurface())

    expect(payload).toMatchObject({
      kind: 'notification',
      surfaceType: 'match_invite',
      surfaceKey: 'invite-1',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
      presentation: 'compact',
      title: 'Bam Rally',
      headline: 'Bam Rally',
      actorName: 'Bam Rally',
      subtitle: '1v1 basketball',
      compactBody: 'Basketball invite',
      expandedSubtitle: '1v1 basketball',
      activityType: 'basketball',
      primaryMetricLabel: 'MODE',
      primaryMetricValue: '1v1',
      primaryAction: {
        type: 'accept_invite',
        label: 'Accept',
        style: 'primary',
        url: expect.stringContaining('rallyapp:///overlay-action?'),
      },
    })
  })

  it('serializes accept friend request actions to overlay deep links', () => {
    const surface: RallyIslandSurface = {
      key: 'friend-request-1',
      surfaceType: 'friend_request',
      eyebrow: 'FRIEND REQUEST',
      title: 'Mina added you',
      headline: 'Mina added you',
      actorName: 'Mina',
      subtitle: 'Open Rally to review the request',
      body: 'Open Rally to review the request',
      accentColor: '#808bc3',
      iconName: 'account-plus',
      route: '/friends',
      primaryAction: {
        type: 'accept_friend_request',
        label: 'Accept',
        style: 'primary',
        requesterId: REQUESTER_ID,
      },
      secondaryAction: {
        type: 'dismiss_friend_request',
        label: 'Dismiss',
        style: 'secondary',
      },
      accessibilityLabel: 'Friend request from Mina',
    }

    const url = createOverlayActionUrl(surface.primaryAction!, surface)
    const payload = toAndroidOverlaySurface(surface)

    expect(url).toContain('rallyapp:///overlay-action?')
    expect(url).toContain('action=accept_friend_request')
    expect(url).toContain(`requesterId=${REQUESTER_ID}`)
    expect(createOverlayActionUrl(surface.secondaryAction!, surface)).toBeUndefined()
    expect(payload).toMatchObject({
      requesterId: REQUESTER_ID,
      primaryAction: {
        type: 'accept_friend_request',
        label: 'Accept',
      },
      secondaryAction: {
        type: 'dismiss_friend_request',
        label: 'Dismiss',
        url: undefined,
      },
    })
  })

  it('converts native custom scheme URLs back to Expo Router paths', () => {
    expect(nativeUrlToRoute(`rallyapp://match/${MATCH_ID}?from=overlay`)).toBe(
      `/match/${MATCH_ID}?from=overlay`,
    )
    expect(nativeUrlToRoute('rallyapp://notifications')).toBe('/notifications')
  })

  it('selects iOS ActivityKit when match invite Live Activities are available', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'active',
      platform: 'ios',
      systemLiveActivityAvailable: true,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: true,
      notificationPermissionGranted: true,
    })).toBe('system_live_activity')
  })

  it('selects iOS ActivityKit for live runs when available', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'live_run',
      appState: 'active',
      platform: 'ios',
      systemLiveActivityAvailable: true,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: true,
      notificationPermissionGranted: true,
    })).toBe('system_live_activity')
  })

  it('selects Android system notification in foreground only when interaction is reliable', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'active',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: true,
      androidSystemSurfaceCapabilityTier: 'capsule_capable',
      notificationPermissionGranted: true,
    })).toBe('system_notification')
  })

  it('uses OS capsule with app expanded fallback for foreground Android display-only OEM islands', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'active',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      androidSystemSurfaceCapabilityTier: 'display_only_capsule',
      notificationPermissionGranted: true,
    })).toBe('system_capsule_app_expand')
  })

  it('does not require overlay permission for Android capsule to Home expanded fallback', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'active',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      androidSystemSurfaceCapabilityTier: 'display_only_capsule',
      androidOverlayPermissionGranted: false,
      notificationPermissionGranted: true,
    })).toBe('system_capsule_app_expand')
  })

  it('keeps Android OS capsule for background display-only OEM islands', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'background',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      androidSystemSurfaceCapabilityTier: 'display_only_capsule',
      notificationPermissionGranted: true,
    })).toBe('system_capsule_app_expand')
  })

  it('uses React fallback in foreground for Android standard notification devices', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'active',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      androidSystemSurfaceCapabilityTier: 'standard_notification',
      notificationPermissionGranted: true,
    })).toBe('react_fallback')
  })

  it('uses normal system notifications in background for Android standard notification devices', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'background',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      androidSystemSurfaceCapabilityTier: 'standard_notification',
      notificationPermissionGranted: true,
    })).toBe('system_notification')
  })

  it('uses actionable system notifications for iOS friend requests', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'friend_request',
      appState: 'active',
      platform: 'ios',
      systemLiveActivityAvailable: true,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: true,
      notificationPermissionGranted: true,
    })).toBe('system_notification')
  })

  it('uses React fallback only when foreground and no system surface is usable', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'inactive',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      notificationPermissionGranted: false,
    })).toBe('react_fallback')
    expect(selectRallyIslandHostDecision({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'inactive',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      notificationPermissionGranted: false,
    })).toMatchObject({
      host: 'react_fallback',
      shouldRenderReactFallback: true,
      usesSystemSurface: false,
    })
  })

  it('returns none in background when no OS surface can own the presentation', () => {
    expect(selectRallyIslandHost({
      hasSurface: true,
      surfaceType: 'match_invite',
      appState: 'background',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: false,
      notificationPermissionGranted: false,
    })).toBe('none')
  })

  it('returns none when no island surface exists', () => {
    expect(selectRallyIslandHost({
      hasSurface: false,
      appState: 'active',
      platform: 'android',
      systemLiveActivityAvailable: false,
      systemNotificationAvailable: true,
      systemSurfaceInteractionAvailable: true,
      notificationPermissionGranted: true,
    })).toBe('none')
  })
})
