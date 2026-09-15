import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { ChallengeEventsBlock } from '@/components/challenges/ChallengeEventsBlock'
import { PressableScale } from '@/components/motion/PressableScale'
import { Screen } from '@/components/layout/Screen'
import { Radius, type SportPalette } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useSportTheme } from '@/hooks/useAppTheme'

function navigateBackOrHome() {
  if (router.canGoBack()) {
    router.back()
    return
  }
  router.replace('/(tabs)')
}

export default function CampaignsScreen() {
  const { user } = useAuth()
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Screen edges={['top', 'bottom']} backgroundColor={theme.bg} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.insetLine} pointerEvents="none" />
        <PressableScale style={styles.back} onPress={navigateBackOrHome} accessibilityLabel="Back">
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.arcadeCtaText} />
        </PressableScale>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>OFFICIAL EVENTS</Text>
          <Text style={styles.title}>EVENTS</Text>
        </View>
      </View>

      <ChallengeEventsBlock currentUserId={user?.id} showEmptyState />
    </Screen>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, gap: 14 },
    header: {
      minHeight: 92,
      borderRadius: Radius.xxl,
      borderWidth: 3,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadeCabinet,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      overflow: 'hidden',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.22,
      shadowRadius: 0,
      shadowOffset: { width: 5, height: 7 },
    },
    insetLine: {
      position: 'absolute',
      left: 6,
      right: 6,
      top: 6,
      bottom: 6,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.economy,
      opacity: 0.5,
    },
    back: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCta,
    },
    copy: { flex: 1, gap: 2 },
    eyebrow: {
      color: theme.economy,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '900',
      letterSpacing: 1,
    },
    title: {
      color: theme.arcadeCtaText,
      fontSize: 26,
      lineHeight: 29,
      fontWeight: '900',
      letterSpacing: 0,
    },
  })
}
