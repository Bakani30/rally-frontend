import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'

type RefereeEligibilityStateRowProps = {
  loading?: boolean
  label: string
  onRetry?: () => void
  retryLabel?: string
  theme: SportPalette
}

export function RefereeEligibilityStateRow({
  loading = false,
  label,
  onRetry,
  retryLabel = 'ลองใหม่',
  theme,
}: RefereeEligibilityStateRowProps) {
  const styles = createStyles(theme)
  return (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.orange} />
      ) : (
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.red} />
      )}
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      {!loading && onRetry ? (
        <PressableScale
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.line,
    },
    label: {
      flex: 1,
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '700',
      fontFamily: Fonts?.thaiMedium,
    },
    retryButton: {
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    retryText: {
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '900',
      fontFamily: Fonts?.thaiMedium,
    },
  })
}
