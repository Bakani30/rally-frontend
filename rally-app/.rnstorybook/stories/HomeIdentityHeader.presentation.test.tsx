import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  dark: false,
  pressables: [] as Array<{ accessibilityLabel?: string; style: unknown }>,
  views: [] as Array<{ accessibilityLabel?: string; style: unknown }>,
  images: [] as Array<{ source?: number; style: unknown }>,
  texts: [] as Array<{ children?: React.ReactNode; style: unknown }>,
}))

vi.mock('react-native', () => ({
  Platform: { select: <T,>(values: { default?: T; ios?: T }) => values.ios ?? values.default },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: ({ children, style }: { children?: React.ReactNode; style: unknown }) => {
    harness.texts.push({ children, style })
    return React.createElement('span', null, children)
  },
  View: ({ children, style, accessibilityLabel }: { children?: React.ReactNode; style?: unknown; accessibilityLabel?: string }) => {
    harness.views.push({ accessibilityLabel, style })
    return React.createElement('div', null, children)
  },
}))
vi.mock('expo-image', () => ({
  Image: ({ source, style }: { source?: number; style: unknown }) => {
    harness.images.push({ source, style })
    return React.createElement('img')
  },
}))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: ({ children, style, accessibilityLabel }: { children?: React.ReactNode; style: unknown; accessibilityLabel?: string }) => {
    harness.pressables.push({ style, accessibilityLabel })
    return React.createElement('button', { 'aria-label': accessibilityLabel }, children)
  },
}))
vi.mock('@/hooks/useAppTheme', () => ({
  useSportTheme: () => ({ bg: '#111', risk: '#c73f41', shadowSoft: 'none', arcadeCabinet: '#161616', arcadePanel: '#fff', line: '#ddd', ink: '#161616', chalk: '#f7f7f2' }),
  useThemeMode: () => (harness.dark ? 'dark' : 'light'),
}))
vi.mock('@/assets/images/home/figma-notification-light.svg', () => ({ default: 1 }))
vi.mock('@/assets/images/home/figma-notification-dark.svg', () => ({ default: 2 }))
vi.mock('@/assets/images/home/figma-location-light.svg', () => ({ default: 3 }))
vi.mock('@/assets/images/home/figma-location-dark.svg', () => ({ default: 4 }))

import { HomeIdentityHeader } from '@/components/home/HomeIdentityHeader'

;(globalThis as { React?: typeof React }).React = React

function flattenedStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.filter(Boolean) : [style]))
}

function renderHeader(dark: boolean) {
  harness.dark = dark
  harness.pressables.length = 0
  harness.views.length = 0
  harness.images.length = 0
  harness.texts.length = 0
  renderToStaticMarkup(React.createElement(HomeIdentityHeader, {
    displayName: 'RALLY PLAYER',
    venueName: 'Benjasiri Park',
    avatarUrl: null,
    notificationUnread: true,
    notificationLabel: 'Notifications',
    profileLabel: 'Profile',
    onPressNotifications: () => undefined,
    onPressProfile: () => undefined,
  }))

  return {
    notification: flattenedStyle(harness.pressables.find((item) => item.accessibilityLabel === 'Notifications')?.style),
    profile: flattenedStyle(harness.pressables.find((item) => item.accessibilityLabel === 'Profile')?.style),
    venue: flattenedStyle(harness.views.find((item) => item.accessibilityLabel?.startsWith('Latest venue:'))?.style),
    avatar: flattenedStyle(harness.views.find((item) => {
      const style = flattenedStyle(item.style)
      return style.width === 40 && style.height === 40 && style.backgroundColor !== undefined
    })?.style),
    locationIcon: flattenedStyle(harness.images.find((item) => item.source === 3 || item.source === 4)?.style),
    venueText: flattenedStyle(harness.texts.find((item) => item.children === 'Benjasiri Park')?.style),
  }
}

describe('HomeIdentityHeader', () => {
  beforeEach(() => {
    harness.dark = false
    harness.pressables.length = 0
    harness.views.length = 0
    harness.images.length = 0
    harness.texts.length = 0
  })

  it('keeps compact 40px controls and right-grouped venue geometry in both themes', () => {
    for (const dark of [false, true]) {
      const { notification, profile, venue, avatar, locationIcon, venueText } = renderHeader(dark)

      const glassFill = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.20)'
      const glassEdge = dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'

      expect(notification).toMatchObject({ left: 0, top: 0, width: 40, height: 40, backgroundColor: '#161616' })
      expect(notification.right).toBeUndefined()
      expect(profile).toMatchObject({ right: 0, top: 0, width: 40, height: 40 })
      expect(profile.left).toBeUndefined()
      expect(venue).toMatchObject({ top: 0, right: 48, width: 128, height: 40, backgroundColor: glassFill, borderWidth: 1, borderColor: glassEdge })
      expect(venue.left).toBeUndefined()
      expect(avatar).toMatchObject({ width: 40, height: 40, backgroundColor: glassFill, borderWidth: 1, borderColor: glassEdge })
      expect(locationIcon.tintColor).toBe(dark ? undefined : '#161616')
      expect(venueText.color).toBe(dark ? '#f7f7f2' : '#161616')
    }
  })
})
