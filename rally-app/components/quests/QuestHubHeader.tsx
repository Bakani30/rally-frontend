import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'

// Spec: points gold = #eac31a (dark) / #c79100 (light)
const GOLD_DARK = '#eac31a'
const GOLD_LIGHT = '#c79100'
// Basketball orange — eyebrow accent, mode-independent
const EYEBROW_ORANGE = '#ff8a00'

type QuestHubHeaderProps = {
  total: number
  doneCount: number
  earnedToday: number
  onBack?: () => void
}

export function QuestHubHeader({ total, doneCount, earnedToday, onBack }: QuestHubHeaderProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const gold = isDark ? GOLD_DARK : GOLD_LIGHT
  const styles = createStyles(theme, gold)
  const remaining = Math.max(0, total - doneCount)
  return (
    <View style={styles.header}>
      <View style={styles.insetLine} pointerEvents="none" />
      {onBack != null && (
        <PressableScale style={styles.back} onPress={onBack} accessibilityLabel="Back">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#161616" />
        </PressableScale>
      )}
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>เควสประจำวัน</Text>
        <Text style={styles.title}>QUESTS</Text>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {'วันนี้ได้ '}
              <Text style={[styles.pillStrong, { color: gold }]}>+{earnedToday}</Text>
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {'เหลือ '}
              <Text style={[styles.pillStrong, { color: '#ffffff' }]}>{remaining}</Text>
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.vault}>
        <Text style={styles.vaultValue} accessibilityRole="text">
          {doneCount}/{total}
        </Text>
        <Text style={styles.vaultLabel}>สำเร็จ</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette, gold: string) {
  return StyleSheet.create({
    header: {
      minHeight: 92,
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: '#2a2f3a',
      // Scoreboard: always dark band regardless of app theme
      backgroundColor: '#161b24',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: Spacing.md,
      overflow: 'hidden',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.45,
      shadowRadius: 0,
      shadowOffset: { width: 4, height: 5 },
    },
    insetLine: {
      position: 'absolute',
      left: 5,
      right: 5,
      top: 5,
      bottom: 5,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      opacity: 1,
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: '#ff8a00',
      backgroundColor: '#ff8a00',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    eyebrow: {
      color: EYEBROW_ORANGE,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
    },
    title: {
      color: '#ffffff',
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '900',
      fontStyle: 'italic',
    },
    pills: { flexDirection: 'row', gap: 6, marginTop: 2 },
    pill: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: Radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    pillText: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 10,
      fontWeight: '700',
    },
    pillStrong: {
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    vault: {
      minWidth: 56,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.5)',
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    vaultValue: {
      color: '#ffffff',
      fontSize: 19,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
    },
    vaultLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
      marginTop: 1,
    },
  })
}
