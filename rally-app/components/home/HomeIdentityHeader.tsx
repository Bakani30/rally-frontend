import { Image as ExpoImage } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import notificationDark from '@/assets/images/home/figma-notification-dark.svg'
import notificationLight from '@/assets/images/home/figma-notification-light.svg'
import locationDark from '@/assets/images/home/figma-location-dark.svg'
import locationLight from '@/assets/images/home/figma-location-light.svg'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'

const HEADER_CONTROL_SIZE = 40
const HEADER_AVATAR_SIZE = 40
const HEADER_VENUE_WIDTH = 128
const HEADER_VENUE_RIGHT = 48

type HomeIdentityHeaderProps = {
  displayName: string | null | undefined
  rallyId?: string | null
  venueName?: string | null
  avatarUrl: string | null | undefined
  notificationUnread: boolean
  notificationLabel: string
  profileLabel: string
  onPressNotifications: () => void
  onPressProfile: () => void
}

export function HomeIdentityHeader({
  displayName,
  venueName,
  avatarUrl,
  notificationUnread,
  notificationLabel,
  profileLabel,
  onPressNotifications,
  onPressProfile,
}: HomeIdentityHeaderProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const styles = createStyles(theme, isDark)
  const name = displayName?.trim() || 'RALLY PLAYER'
  const initial = name[0]?.toUpperCase() || 'R'

  return (
    <View style={styles.root}>
      <PressableScale
        style={styles.notificationButton}
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={notificationLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ExpoImage source={isDark ? notificationDark : notificationLight} style={styles.notificationIcon} contentFit="contain" />
        {notificationUnread && <View style={styles.notificationDot} />}
      </PressableScale>

      {venueName?.trim() && (
        <View style={styles.venuePill} accessibilityLabel={`Latest venue: ${venueName.trim()}`}>
          <ExpoImage
            source={isDark ? locationDark : locationLight}
            style={[styles.locationIcon, !isDark && styles.locationIconLight]}
            contentFit="contain"
          />
          <Text style={styles.venueText} numberOfLines={1}>{venueName.trim()}</Text>
        </View>
      )}

      <PressableScale
        style={styles.avatarButton}
        onPress={onPressProfile}
        accessibilityRole="button"
        accessibilityLabel={profileLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.avatarFace}>
          {avatarUrl ? (
            <ExpoImage source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" transition={150} />
          ) : (
            <Text style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette, isDark: boolean) {
  return StyleSheet.create({
    root: {
      height: HEADER_AVATAR_SIZE,
      position: 'relative',
    },
    notificationButton: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: HEADER_CONTROL_SIZE,
      height: HEADER_CONTROL_SIZE,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
      boxShadow: theme.shadowSoft,
    },
    notificationDot: {
      position: 'absolute',
      right: -1,
      top: -1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.risk,
      borderWidth: 1.5,
      borderColor: theme.bg,
    },
    notificationIcon: { width: 24, height: 24 },
    venuePill: {
      position: 'absolute',
      top: 0,
      right: HEADER_VENUE_RIGHT,
      width: HEADER_VENUE_WIDTH,
      height: HEADER_CONTROL_SIZE,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.20)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
    },
    venueText: {
      color: isDark ? theme.chalk : theme.ink,
      fontFamily: Fonts?.sans,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      flexShrink: 1,
    },
    locationIcon: { width: 16, height: 16 },
    locationIconLight: { tintColor: theme.ink },
    avatarButton: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: HEADER_AVATAR_SIZE,
      height: HEADER_AVATAR_SIZE,
      borderRadius: HEADER_AVATAR_SIZE / 2,
    },
    avatarFace: {
      width: HEADER_AVATAR_SIZE,
      height: HEADER_AVATAR_SIZE,
      borderRadius: HEADER_AVATAR_SIZE / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.20)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
    },
    avatarImage: {
      width: HEADER_AVATAR_SIZE,
      height: HEADER_AVATAR_SIZE,
    },
    avatarInitial: {
      color: theme.chalk,
      fontFamily: Fonts?.rounded,
      fontSize: 24,
      lineHeight: 29,
      fontWeight: '900',
    },
  })
}
