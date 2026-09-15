import type { ImageSourcePropType } from 'react-native'

export const HOME_ICON_ASSETS = {
  'badminton': require('../../assets/icons/home/generated/badminton.png'),
  'basketball': require('../../assets/icons/home/generated/basketball.png'),
  'bell-notification': require('../../assets/icons/home/generated/bell-notification.png'),
  'events-trophy-calendar': require('../../assets/icons/home/generated/events-trophy-calendar.png'),
  'friend-invite': require('../../assets/icons/home/generated/friend-invite.png'),
  'history-recap': require('../../assets/icons/home/generated/history-recap.png'),
  'home-arena-gate': require('../../assets/icons/home/generated/home-arena-gate.png'),
  'lobby-invite': require('../../assets/icons/home/generated/lobby-invite.png'),
  'manual-proof': require('../../assets/icons/home/generated/manual-proof.png'),
  'ranking-podium': require('../../assets/icons/home/generated/ranking-podium.png'),
  'referee-whistle-shield': require('../../assets/icons/home/generated/referee-whistle-shield.png'),
  'rewards-vault': require('../../assets/icons/home/generated/rewards-vault.png'),
  'running': require('../../assets/icons/home/generated/running.png'),
  'sensor-sync-shield': require('../../assets/icons/home/generated/sensor-sync-shield.png'),
  'video-proof': require('../../assets/icons/home/generated/video-proof.png'),
  'weekly-mission-check': require('../../assets/icons/home/generated/weekly-mission-check.png'),
} as const satisfies Record<string, ImageSourcePropType>

export type GeneratedHomeIconName = keyof typeof HOME_ICON_ASSETS
