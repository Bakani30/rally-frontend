import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Radius, Spacing, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useRunArenaTheme } from '@/hooks/useAppTheme'
import { useAlphaRunningGate } from '@/hooks/useAlphaRunningGate'
import { useAnalytics } from '@/hooks/useAnalytics'
import { RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY } from '@/lib/run-tracking/alphaRunningGate'

export function AlphaRunningGateBoundary({ children }: { children: ReactNode }) {
  const gate = useAlphaRunningGate()
  const palette = useRunArenaTheme()
  const styles = createStyles(palette)
  const { track } = useAnalytics()

  const isLocked = !gate.isLoading && !gate.isEnabled(RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY)

  useEffect(() => {
    if (isLocked) {
      track({ name: 'running_gate_locked' })
    }
  }, [isLocked, track])

  if (gate.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator color={palette.trust} />
      </SafeAreaView>
    )
  }

  if (isLocked) {
    return <AlphaRunningLockedScreen styles={styles} palette={palette} />
  }

  return <>{children}</>
}

function AlphaRunningLockedScreen({
  styles,
  palette,
}: {
  styles: ReturnType<typeof createStyles>
  palette: RunArenaColors
}) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-check-outline" size={32} color={palette.trust} />
        </View>
        <Text style={styles.eyebrow}>ยังไม่เปิด alpha</Text>
        <Text style={styles.title}>Running GPS alpha ยังไม่เปิดให้บัญชีนี้</Text>
        <Text style={styles.body}>
          ฟีเจอร์วิ่ง GPS เปิดเฉพาะ tester ที่อยู่ใน allowlist ตอนนี้
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={17} color={palette.chalk} />
            <Text style={styles.primaryText}>ย้อนกลับ</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              void Linking.openURL('mailto:support@rally.app?subject=Running%20GPS%20alpha%20access')
            }}
          >
            <MaterialCommunityIcons name="lifebuoy" size={17} color={palette.trust} />
            <Text style={styles.secondaryText}>ติดต่อช่วยเหลือ</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      gap: Spacing.md,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.trustSoft,
      borderWidth: 1,
      borderColor: palette.trust,
    },
    eyebrow: {
      color: palette.trust,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0,
      lineHeight: 28,
    },
    body: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    primaryButton: {
      minHeight: 46,
      paddingHorizontal: 18,
      borderRadius: Radius.lg,
      backgroundColor: palette.trust,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryText: {
      color: palette.chalk,
      fontSize: 13,
      fontWeight: '900',
    },
    secondaryButton: {
      minHeight: 46,
      paddingHorizontal: 18,
      borderRadius: Radius.lg,
      backgroundColor: palette.surfaceRaised,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryText: {
      color: palette.trust,
      fontSize: 13,
      fontWeight: '900',
    },
  })
}
