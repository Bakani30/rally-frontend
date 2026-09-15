import type { ComponentProps } from 'react'
import type { MaterialCommunityIcons } from '@expo/vector-icons'

import type { ComingSoonFeatureKey } from '@/lib/roadmap/comingSoonFeatures'

export type MenuIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type HomeShortcutKey =
  | 'lobby'
  | 'quest'
  | 'event'
  | 'referee'

export type HomeShortcut = {
  key: HomeShortcutKey
  // English heading, kept in Rally's game display voice (RallyText variant="head").
  label: string
  // Thai subtitle under the heading (RallyText variant="body" → IBM Plex Thai).
  subtitle: string
  icon: MenuIconName
  // Maps to a ShortcutAccent fill (see constants/theme.ts).
  tone: 'orange' | 'azure' | 'coral' | 'indigo' | 'yellow'
  // 'primary' tiles lead the rail as the big, prominent cards; 'secondary' tiles sit
  // smaller in the row beneath them.
  weight: 'primary' | 'secondary'
  route: string
  actionKey: string
  accessibilityLabel: string
  // Set when the feature is not shippable yet: the tile renders a locked badge and
  // the route points to its /coming-soon/<key> screen instead of a real destination.
  comingSoon?: ComingSoonFeatureKey
}

export const REWARDS_TAB_ITEM = {
  routeName: 'redeem',
  label: 'Rewards',
  icon: 'gift-outline',
} as const satisfies {
  routeName: 'redeem'
  label: string
  icon: MenuIconName
}

// New Home keeps four quick entry points in a single compact rail.
export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    key: 'lobby',
    label: 'Lobby',
    subtitle: 'ค้นหาห้อง',
    icon: 'stadium',
    tone: 'orange',
    weight: 'secondary',
    route: '/lobbies',
    actionKey: 'home:shortcut:lobby',
    accessibilityLabel: 'Open Lobby',
  },
  {
    key: 'quest',
    label: 'Quest',
    subtitle: 'ภารกิจรายวัน',
    icon: 'clipboard-list-outline',
    tone: 'azure',
    weight: 'secondary',
    route: '/quests',
    actionKey: 'home:shortcut:quest',
    accessibilityLabel: 'Open Quest',
  },
  {
    key: 'event',
    label: 'Event',
    subtitle: 'กิจกรรมและภารกิจรายสัปดาห์',
    icon: 'calendar-star',
    tone: 'yellow',
    weight: 'secondary',
    route: '/campaigns',
    actionKey: 'home:shortcut:event',
    accessibilityLabel: 'Open Event',
  },
  {
    key: 'referee',
    label: 'Referee',
    subtitle: 'กรรมการและการตัดสิน',
    icon: 'whistle-outline',
    tone: 'indigo',
    weight: 'secondary',
    route: '/referee',
    actionKey: 'home:shortcut:referee',
    accessibilityLabel: 'Open Referee',
  },
]
